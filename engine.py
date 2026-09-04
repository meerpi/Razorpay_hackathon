"""
engine.py — Decision engine for AI Revenue Recovery.

Refactored to the concise, dictionary-dispatched, modular pattern of
codecrafters-shell-python/app/main.py.

Decomposes recovery into focused single-responsibility handlers dispatched
through an explicit pipeline.
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Any

from models import (
    FailureInput, Decision, AgentResult, Event,
    DeclineClass, CaseStatus, CaseType, RecoveryMethod, EventType,
)
from engine_config import EngineConfig
from timing_engine import predict_optimal_retry_slot
from razorpay_client import create_payment_link
from constants import (
    CHECKOUT_RECOVERY_RATES, B2B_DUNNING_TIERS, B2B_RECOVERY_RATES,
    MSMED_PENAL_INTEREST_ANNUAL_RATE,
)

IST = timezone(timedelta(hours=5, minutes=30))

HINGLISH_VOICE_MESSAGES = [
    "Namaste {name} ji, aapka {amount} ka payment fail ho gaya hai. Kya aap abhi retry karna chahenge?",
    "Hello {name} ji, {amount} rupaye ka payment pending hai. Card update karke dubara try karein?",
    "Hi {name}, aapki subscription ka {amount} ka payment nahi hua. Naya card add karein ya UPI se pay karein?",
    "{name} ji, aapka EMI payment of {amount} overdue hai. Kya hum aapko payment link bhej dein?",
    "Namaste, {name} ji ka {amount} ka autopay fail hua hai. Balance check karke retry karein?",
    "Hello {name}, aapki subscription renew nahi hui. {amount} pay karke service continue rakhein?",
]


def make_decision(case_id: str, ts: str, action: str, rule: str, reason: str, details=None, seq=0) -> Decision:
    dec_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"decision:{case_id}:{seq}:{action}:{rule}:{ts}"))
    return Decision(
        decision_id=dec_id,
        case_id=case_id,
        timestamp=ts,
        action=action,
        rule_fired=rule,
        reason=reason,
        details=details or {},
    )


def make_event(case_id: str, etype: str, ts: str, data=None, amount=0, channel=None, agent=None, notes=None, seq=0) -> Event:
    evt_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"event:{case_id}:{seq}:{etype}:{ts}:{channel}:{notes}"))
    return Event(
        event_id=evt_id,
        case_id=case_id,
        event_type=etype,
        event_timestamp=ts,
        event_data=data or {},
        recovery_amount_paise=amount,
        channel=channel,
        agent_type=agent,
        notes=notes,
    )


def classify_decline(error_reason: str, config: EngineConfig) -> str:
    if error_reason in config.hard_decline_reasons:
        return DeclineClass.HARD.value
    elif error_reason in config.technical_decline_reasons:
        return DeclineClass.TECHNICAL.value
    return DeclineClass.SOFT.value


def is_within_calling_window(dt: datetime, config: EngineConfig) -> bool:
    return config.calling_window_start <= dt.hour < config.calling_window_end


def next_calling_window(dt: datetime, config: EngineConfig) -> datetime:
    if is_within_calling_window(dt, config):
        return dt
    if dt.hour >= config.calling_window_end:
        next_day = dt + timedelta(days=1)
        return next_day.replace(hour=config.calling_window_start, minute=0, second=0)
    return dt.replace(hour=config.calling_window_start, minute=0, second=0)


# ─── Stage Handlers (Pipeline Steps) ───────────────────────────

def get_init_event_details(f: FailureInput, error_details: dict) -> Tuple[str, str]:
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        return EventType.CHECKOUT_DROPOFF_DETECTED.value, f.error_description or "Checkout cart abandoned."
    if f.case_type == CaseType.B2B_RECEIVABLE.value:
        return EventType.B2B_INVOICE_ISSUED.value, f.error_description or f"B2B Invoice #{f.invoice_id} issued."
    if f.case_type == CaseType.MANDATE.value:
        return EventType.MANDATE_FAILED.value, error_details.get("error_description", "Payment failed.")
    return EventType.PAYMENT_FAILED.value, error_details.get("error_description", "Payment failed.")


def stage_classify_and_init(ctx: Dict[str, Any]):
    f, cfg = ctx["failure"], ctx["config"]
    d_class = classify_decline(f.error_reason, cfg)
    ctx["decline_class"] = d_class
    ctx["add_dec"](
        "classify", f"{d_class}_decline_classified",
        f"Error reason '{f.error_reason}' classified as {d_class} decline.",
        {"error_reason": f.error_reason, "decline_class": d_class},
    )
    init_evt, init_notes = get_init_event_details(f, ctx["error_details"])
    ctx["add_evt"](
        init_evt,
        data={"razorpay_payment_id": f.payment_id, "error_reason": f.error_reason, "amount_paise": f.amount_paise, "method": f.method},
        channel=f.method, agent="system", notes=init_notes,
    )
    if f.case_type == CaseType.SUBSCRIPTION.value:
        ctx["add_evt"](EventType.SUBSCRIPTION_PENDING.value, data={"subscription_id": f.sub_id, "status": "pending"}, agent="system")


def stage_checkout_dropoff_recovery(ctx: Dict[str, Any]):
    f = ctx["failure"]
    if f.case_type != CaseType.CHECKOUT_DROP_OFF.value:
        return
    stage = f.checkout_stage or "cart_abandoned"
    ctx["recovery_method"] = RecoveryMethod.PAYMENT_LINK.value
    link_url = f"https://rzp.io/i/{f.order_id[-8:]}"
    ctx["add_dec"]("generate_link", "checkout_dropoff_recovery_link_created", f"Generated 1-click recovery link for {stage} ({f.error_reason}): {link_url}", {"checkout_stage": stage, "link_url": link_url})
    ctx["add_evt"](EventType.CHECKOUT_LINK_DISPATCHED.value, channel="whatsapp", agent="system", notes=f"Magic Checkout link sent via WhatsApp: {link_url}")
    rate = CHECKOUT_RECOVERY_RATES.get(stage, 0.20)
    draw = ctx["rng"].random()
    recovered = draw < rate
    ctx["add_dec"]("checkout_recovery_check", f"checkout_conversion_{stage}", f"Recovery evaluation for stage '{stage}' (rate {rate:.0%}): {'recovered' if recovered else 'abandoned'}.", {"stage": stage, "rate": rate, "outcome": "recovered" if recovered else "unrecovered"})
    if recovered:
        ctx["recovered"] = True
        ctx["recovered_amount"] = f.amount_paise
        ctx["case_status"] = CaseStatus.RECOVERED.value
        ctx["add_evt"](EventType.RECOVERED.value, amount=f.amount_paise, channel="payment_link", agent="system", notes="Recovered via 1-click checkout link")
        ctx["add_dec"]("recover", "checkout_dropoff_recovered", f"Recovered ₹{f.amount_paise/100:,.2f} via checkout recovery link.", {"recovered_amount_paise": f.amount_paise})


def dispatch_b2b_dunning_action(ctx: Dict[str, Any], f, bucket: str):
    inv = f.invoice_id or "inv_unknown"
    tier = f.dunning_tier or B2B_DUNNING_TIERS.get(bucket, "pre_due_courtesy")
    details = {"tier": tier, "aging_bucket": bucket, "days_overdue": f.days_overdue}
    if bucket == "current":
        ctx["add_dec"]("b2b_dunning_dispatched", "b2b_pre_due_courtesy", f"Invoice #{inv} within terms. Sent pre-due courtesy reminder to {f.contact_email}.", details)
        ctx["add_evt"](EventType.B2B_AP_REMINDER_SENT.value, channel="email", agent="system", notes=f"Pre-due reminder to {f.company_name}")
    elif bucket == "1_15_days":
        ctx["add_dec"]("b2b_dunning_dispatched", "b2b_gentle_ap_reminder", f"Invoice #{inv} {f.days_overdue}d overdue. Sent statement reconciliation notice.", details)
        ctx["add_evt"](EventType.B2B_AP_REMINDER_SENT.value, channel="email", agent="system", notes=f"Gentle AP reminder ({f.days_overdue}d overdue)")
    elif bucket == "16_30_days":
        ctx["add_dec"]("b2b_dunning_dispatched", "b2b_formal_ap_notice", f"Invoice #{inv} {f.days_overdue}d overdue. Sent formal AP demand notice requesting UTR.", details)
        ctx["add_evt"](EventType.B2B_AP_NOTICE_SENT.value, channel="email", agent="system", notes=f"Formal AP demand notice to {f.company_name}")
    elif bucket == "31_60_days":
        details["section_43bh_warning"] = True
        ctx["add_dec"]("b2b_dunning_dispatched", "b2b_cfo_escalation_sec43bh", f"Invoice #{inv} {f.days_overdue}d overdue. Escalated to CFO (Section 43B(h) alert).", details)
        ctx["add_evt"](EventType.B2B_CFO_ESCALATED.value, channel="email", agent="system", notes=f"CFO escalation (Section 43B(h)) to {f.company_name}")
    else:
        penal_interest = int(f.amount_paise * (MSMED_PENAL_INTEREST_ANNUAL_RATE * (max(1, f.days_overdue) / 365.0)))
        details["msmed_section_16_interest"] = True
        details["penal_interest_paise"] = penal_interest
        ctx["add_dec"]("b2b_dunning_dispatched", "b2b_msmed_statutory_notice", f"Invoice #{inv} {f.days_overdue}d overdue. Issued statutory MSMED Section 16 penal notice (Interest: ₹{penal_interest/100:,.2f}).", details)
        ctx["add_evt"](EventType.B2B_MSME_NOTICE_SERVED.value, channel="legal", agent="system", notes=f"MSMED statutory notice served to {f.company_name}")


def stage_b2b_receivables_dunning(ctx: Dict[str, Any]):
    f = ctx["failure"]
    if f.case_type != CaseType.B2B_RECEIVABLE.value:
        return
    bucket = f.aging_bucket or "current"
    ctx["recovery_method"] = RecoveryMethod.EMAIL.value if bucket in ("current", "1_15_days", "16_30_days") else (RecoveryMethod.VOICE.value if bucket == "31_60_days" else RecoveryMethod.MANUAL.value)
    dispatch_b2b_dunning_action(ctx, f, bucket)
    rate = B2B_RECOVERY_RATES.get(bucket, 0.50)
    draw = ctx["rng"].random()
    recovered = draw < rate
    ctx["add_dec"]("b2b_dunning_outcome", f"b2b_recovery_{bucket}", f"B2B collection evaluation ({rate:.0%}): {'recovered' if recovered else 'unrecovered'}.", {"aging_bucket": bucket, "rate": rate, "outcome": "recovered" if recovered else "unrecovered"})
    if recovered:
        ctx["recovered"] = True
        ctx["recovered_amount"] = f.amount_paise
        ctx["case_status"] = CaseStatus.RECOVERED.value
        ctx["add_evt"](EventType.B2B_INVOICE_SETTLED.value, amount=f.amount_paise, channel="neft_rtgs", agent="system", notes=f"Invoice #{f.invoice_id} settled")
        ctx["add_dec"]("recover", "b2b_invoice_recovered", f"Recovered ₹{f.amount_paise/100:,.2f} for invoice #{f.invoice_id} ({f.company_name}).", {"recovered_amount_paise": f.amount_paise})


def check_predebit_notification(ctx: Dict[str, Any], f, cfg):
    if cfg.predebit_notification_hours is not None:
        ctx["add_dec"](
            "pre_debit_notify", "pre_debit_notification_24h",
            f"RBI e-mandate framework requires pre-debit notification {cfg.predebit_notification_hours}h before debit.",
            {"hours_before": cfg.predebit_notification_hours, "amount_paise": f.amount_paise},
        )
        ctx["add_evt"](
            EventType.PRE_DEBIT_NOTIFICATION.value,
            data={"notification_hours": cfg.predebit_notification_hours, "amount_paise": f.amount_paise},
            agent="system", notes=f"Pre-debit notification sent {cfg.predebit_notification_hours}h before debit attempt.",
        )


def check_afa_threshold(ctx: Dict[str, Any], f, cfg):
    if cfg.afa_threshold_paise is not None:
        exceeds = f.amount_paise > cfg.afa_threshold_paise
        rule = "afa_required_amount_exceeds_15000" if exceeds else "afa_not_required_below_threshold"
        reason = (
            f"Amount ₹{f.amount_paise/100:,.0f} exceeds AFA-free limit ₹{cfg.afa_threshold_paise/100:,.0f}. Additional Factor Authentication required."
            if exceeds else f"Amount ₹{f.amount_paise/100:,.0f} within AFA-free limit ₹{cfg.afa_threshold_paise/100:,.0f}. No AFA needed."
        )
        ctx["add_dec"]("afa_check", rule, reason, {"amount_paise": f.amount_paise, "afa_required": exceeds})
        if exceeds:
            ctx["add_evt"](
                EventType.AFA_REQUIRED.value,
                data={"amount_paise": f.amount_paise, "threshold_paise": cfg.afa_threshold_paise},
                agent="system", notes=f"AFA required: amount ₹{f.amount_paise/100:,.0f} > threshold ₹{cfg.afa_threshold_paise/100:,.0f}",
            )


def stage_mandate_checks(ctx: Dict[str, Any]):
    f = ctx["failure"]
    cfg = ctx["config"]
    if f.case_type != CaseType.MANDATE.value:
        return
    check_predebit_notification(ctx, f, cfg)
    check_afa_threshold(ctx, f, cfg)


def handle_retry_success(ctx: Dict[str, Any], f, cfg):
    """Handle state updates when auto-retry succeeds."""
    ctx["recovered"] = True
    ctx["recovered_amount"] = f.amount_paise
    ctx["case_status"] = CaseStatus.RECOVERED.value
    ctx["add_evt"](EventType.RETRY_SUCCEEDED.value, data={"retry_number": ctx["retry_count"], "method": f.method}, amount=f.amount_paise, channel="auto_retry", agent="system", notes=f"Auto-retry #{ctx['retry_count']} succeeded")
    ctx["add_evt"](EventType.RECOVERED.value, amount=f.amount_paise, channel="auto_retry", agent="system")
    ctx["add_dec"]("recover", f"auto_retry_recovery_attempt_{ctx['retry_count']}", f"Payment recovered via auto-retry attempt #{ctx['retry_count']}.", {"recovered_amount_paise": f.amount_paise, "method": "auto_retry"})
    if cfg.postdebit_confirmation_required and f.case_type == CaseType.MANDATE.value:
        trigger_postdebit_confirmation(ctx)


def execute_single_retry(ctx: Dict[str, Any], attempt: int, max_r: int, policy) -> bool:
    """Execute a single contextual retry attempt using Bayesian Shrinkage slot."""
    f, cfg, d_class = ctx["failure"], ctx["config"], ctx["decline_class"]
    slot = predict_optimal_retry_slot(f, attempt=attempt)
    interval = slot["delay_hours"]
    ctx["current_time"] += timedelta(hours=interval)
    ctx["retry_count"] += 1
    prob = policy.success_probs_by_attempt[attempt - 1] if (attempt - 1) < len(policy.success_probs_by_attempt) else policy.success_probs_by_attempt[-1]
    draw = ctx["rng"].random()
    succeeded = draw < prob
    ctx["add_dec"](
        "retry", f"{d_class}_decline_retry_attempt_{ctx['retry_count']}_of_{max_r}",
        f"Decline class '{d_class}' permits up to {max_r} retries. Attempt {ctx['retry_count']} scheduled for day {slot['target_day']} (weight {slot['shrinkage_weight']}). CBS safe: {slot['cbs_safe']}.",
        {"decline_class": d_class, "retry_number": ctx["retry_count"], "max_retries": max_r, "interval_hours": interval, "target_day": slot["target_day"], "shrinkage_weight": slot["shrinkage_weight"], "cbs_safe": slot["cbs_safe"], "success_probability": prob, "rng_draw": round(draw, 6), "outcome": "succeeded" if succeeded else "failed"},
    )
    if succeeded:
        handle_retry_success(ctx, f, cfg)
        return True
    ctx["add_evt"](EventType.RETRY_FAILED.value, data={"retry_number": ctx["retry_count"], "error_reason": f.error_reason}, channel="auto_retry", agent="system", notes=f"Auto-retry #{ctx['retry_count']} failed: {f.error_reason}")
    return False


def stage_auto_retries(ctx: Dict[str, Any]):
    """Orchestrate multi-attempt contextual auto-retries via Bayesian engine."""
    f, cfg, d_class = ctx["failure"], ctx["config"], ctx["decline_class"]
    if f.case_type in (CaseType.CHECKOUT_DROP_OFF.value, CaseType.B2B_RECEIVABLE.value):
        return
    policy = cfg.retry_policies.get(d_class, cfg.retry_policies.get("soft"))
    max_r = min(policy.max_retries, cfg.subscription_halt_threshold) if f.case_type == CaseType.SUBSCRIPTION.value else policy.max_retries
    ctx["max_retries"] = max_r
    if d_class == DeclineClass.HARD.value:
        ctx["add_dec"]("stop_retries", "hard_decline_no_retry", f"Hard decline '{f.error_reason}' — no auto-retry. Requires customer action.")
        return
    ctx["case_status"] = CaseStatus.RETRYING.value
    ctx["recovery_method"] = RecoveryMethod.AUTO_RETRY.value
    for i in range(1, max_r + 1):
        if execute_single_retry(ctx, i, max_r, policy):
            break


def trigger_postdebit_confirmation(ctx: Dict[str, Any]):
    ctx["add_dec"]("post_debit_confirm", "post_debit_confirmation_sent", "RBI e-mandate framework requires post-debit confirmation after successful collection.", {"amount_paise": ctx["failure"].amount_paise})
    ctx["add_evt"](EventType.POST_DEBIT_CONFIRMATION.value, data={"amount_paise": ctx["failure"].amount_paise}, agent="system", notes="Post-debit confirmation sent: amount, date, reference, grievance mechanism.")


def create_subscription_update_link(ctx: Dict[str, Any], f):
    """Dispatch one-click payment method update link to rescue halted subscription."""
    rzp = ctx.get("rzp_client")
    if not rzp:
        return
    res = create_payment_link(
        rzp, f.amount_paise, f"Update Payment Method for Subscription {f.sub_id or f.case_id}",
        {"name": f.contact_name, "email": f.contact_email, "phone": f.contact_phone}
    )
    url = res.get("short_url") if res else None
    if url:
        ctx["add_dec"](
            "generate_link", "subscription_update_link_created",
            f"Dispatched one-click update link: {url}. Rescues subscription from permanent churn.",
            {"subscription_id": f.sub_id, "update_url": url}
        )
        ctx["add_evt"](EventType.PAYMENT_LINK_CREATED.value, data={"subscription_id": f.sub_id, "url": url}, agent="system", notes=url)


def stage_subscription_halt(ctx: Dict[str, Any]):
    f, cfg = ctx["failure"], ctx["config"]
    if not ctx["recovered"] and f.case_type == CaseType.SUBSCRIPTION.value and ctx["retry_count"] >= cfg.subscription_halt_threshold:
        ctx["add_dec"](
            "stop_retries",
            f"subscription_halt_at_{cfg.subscription_halt_threshold}_retries",
            f"Subscription halted after {ctx['retry_count']} consecutive failed retries ({ctx['retry_count'] + 1} total attempts including initial charge).",
            {"subscription_id": f.sub_id, "consecutive_failures": ctx["retry_count"], "total_attempts": ctx["retry_count"] + 1, "threshold": cfg.subscription_halt_threshold},
        )
        ctx["add_evt"](EventType.SUBSCRIPTION_HALTED.value, data={"subscription_id": f.sub_id, "consecutive_failures": ctx["retry_count"]}, agent="system", notes=f"Subscription halted after {ctx['retry_count']} consecutive failures")
        create_subscription_update_link(ctx, f)


def stage_settlement_and_opt_out_check(ctx: Dict[str, Any]):
    f = ctx["failure"]
    if ctx["recovered"]:
        return

    # Out-of-band settlement
    if f.case_id in ctx["settled_cases"]:
        ctx["add_dec"]("skip_escalation", "out_of_band_settlement_detected", "Case appears in settled_cases — customer paid directly. Skipping all further escalation.", {"case_id": f.case_id})
        ctx["add_evt"](EventType.SETTLEMENT_DETECTED.value, agent="system", notes="Out-of-band settlement detected. No further escalation.")
        ctx["recovered"] = True
        ctx["recovered_amount"] = f.amount_paise
        ctx["case_status"] = CaseStatus.RECOVERED.value
        ctx["recovery_method"] = RecoveryMethod.MANUAL.value
        return

    # Customer opt-out suppression
    if f.contact_phone in ctx["suppressed_contacts"] or f.customer_id in ctx["suppressed_contacts"]:
        ctx["is_suppressed"] = True
        ctx["add_dec"]("skip_escalation", "customer_opted_out", f"Customer '{f.contact_phone}' previously exercised opt-out right. Skipping SMS/email and voice escalation.", {"contact_phone": f.contact_phone})
        ctx["add_evt"](EventType.OPT_OUT_RECORDED.value, agent="system", notes="Escalation suppressed: customer opted out of communication.")
        ctx["case_status"] = CaseStatus.OPTED_OUT.value


def stage_sms_dunning(ctx: Dict[str, Any]):
    if ctx["recovered"] or ctx["is_suppressed"] or ctx["decline_class"] == DeclineClass.HARD.value:
        return
    if ctx["failure"].case_type in (CaseType.CHECKOUT_DROP_OFF.value, CaseType.B2B_RECEIVABLE.value):
        return

    f = ctx["failure"]
    cfg = ctx["config"]
    ctx["current_time"] += timedelta(hours=ctx["rng"].randint(1, 6))

    ctx["add_dec"]("escalate_sms", "retries_exhausted_escalate_sms_email", f"Auto-retries exhausted ({ctx['retry_count']} attempts). Escalating to SMS/email dunning.", {"retry_count": ctx["retry_count"], "max_retries": ctx["max_retries"]})
    ctx["add_evt"](EventType.ESCALATED_TO_SMS.value, channel="sms", agent="system", notes=f"Payment reminder sent to {f.contact_phone}")
    ctx["add_evt"](EventType.ESCALATED_TO_EMAIL.value, channel="email", agent="system", notes=f"Payment reminder sent to {f.contact_email}")

    draw = ctx["rng"].random()
    recovered = draw < cfg.sms_email_recovery_rate
    ctx["add_dec"]("sms_email_outcome", "sms_email_recovery_check", f"SMS/email dunning recovery probability: {cfg.sms_email_recovery_rate:.0%}.", {"success_probability": cfg.sms_email_recovery_rate, "rng_draw": round(draw, 6), "outcome": "recovered" if recovered else "not_recovered"})

    if recovered:
        ctx["current_time"] += timedelta(hours=ctx["rng"].randint(2, 48))
        ctx["recovered"] = True
        ctx["recovered_amount"] = f.amount_paise
        ctx["recovery_method"] = RecoveryMethod.SMS.value
        ctx["case_status"] = CaseStatus.RECOVERED.value
        ctx["add_evt"](EventType.RECOVERED.value, amount=f.amount_paise, channel="sms", agent="system", notes="Customer paid after SMS/email reminder")
        ctx["add_dec"]("recover", "sms_email_recovery", "Payment recovered via SMS/email dunning.", {"recovered_amount_paise": f.amount_paise, "method": "sms"})
        if cfg.postdebit_confirmation_required and f.case_type == CaseType.MANDATE.value:
            trigger_postdebit_confirmation(ctx)


def compute_compliant_voice_time(ctx: Dict[str, Any], cfg) -> datetime:
    vtime = ctx["current_time"] + timedelta(hours=ctx["rng"].randint(2, 24))
    vtime = next_calling_window(vtime, cfg)
    vtime += timedelta(minutes=ctx["rng"].randint(0, 120))
    if not is_within_calling_window(vtime, cfg):
        vtime = next_calling_window(vtime, cfg)
    return vtime


def execute_voice_call(ctx: Dict[str, Any], f, cfg, vtime: datetime):
    ctx["add_dec"]("escalate_voice", "sms_email_exhausted_escalate_voice", "SMS/email dunning did not recover. Escalating to AI voice call within RBI calling window.", {"calling_window": f"{cfg.calling_window_start}:00-{cfg.calling_window_end}:00 IST", "originating_number_series": "1601"}, ts=vtime.isoformat())
    ctx["add_evt"](EventType.ESCALATED_TO_VOICE.value, ts=vtime.isoformat(), channel="voice", agent="ai_voice", notes="Scheduled for AI voice escalation (Hinglish)")
    ctx["add_evt"](EventType.VOICE_ATTEMPTED.value, ts=vtime.isoformat(), channel="voice", agent="ai_voice")

    draw_rpc = ctx["rng"].random()
    rpc_ok = draw_rpc < cfg.voice_rpc_rate
    ctx["add_dec"]("voice_rpc_check", "right_party_contact_check", f"Right-Party Contact rate: {cfg.voice_rpc_rate:.0%} (industry RPC, not raw pickup). Only cases passing RPV can proceed to payment discussion.", {"rpc_rate": cfg.voice_rpc_rate, "rng_draw": round(draw_rpc, 6), "outcome": "rpc_succeeded" if rpc_ok else "rpc_failed"}, ts=vtime.isoformat())
    if not rpc_ok:
        ctx["add_evt"](EventType.VOICE_NOT_PICKED.value, ts=vtime.isoformat(), channel="voice", agent="ai_voice", notes="Right-party contact failed — no debt details disclosed.")
        return

    msg = ctx["rng"].choice(HINGLISH_VOICE_MESSAGES).format(name=f.contact_name.split()[0], amount=f"₹{f.amount_paise/100:,.0f}")
    ctx["add_evt"](EventType.VOICE_CONNECTED.value, ts=vtime.isoformat(), channel="voice", agent="ai_voice", notes=msg)

    draw_conv = ctx["rng"].random()
    converted = draw_conv < cfg.voice_conversion_rate
    ctx["add_dec"]("voice_conversion_check", "voice_conversion_after_rpc", f"Voice conversion rate given RPC: {cfg.voice_conversion_rate:.0%}.", {"conversion_rate": cfg.voice_conversion_rate, "rng_draw": round(draw_conv, 6), "outcome": "converted" if converted else "not_converted"}, ts=vtime.isoformat())
    if converted:
        rectime = vtime + timedelta(minutes=ctx["rng"].randint(5, 120))
        ctx["recovered"] = True
        ctx["recovered_amount"] = f.amount_paise
        ctx["case_status"] = CaseStatus.RECOVERED.value
        ctx["add_evt"](EventType.RECOVERED.value, ts=rectime.isoformat(), amount=f.amount_paise, channel="voice", agent="ai_voice", notes="Customer paid after AI voice call")
        ctx["add_dec"]("recover", "voice_recovery", "Payment recovered via AI voice escalation after RPV verification.", {"recovered_amount_paise": f.amount_paise, "method": "voice"}, ts=rectime.isoformat())
        if cfg.postdebit_confirmation_required and f.case_type == CaseType.MANDATE.value:
            trigger_postdebit_confirmation(ctx)


def stage_voice_escalation(ctx: Dict[str, Any]):
    if ctx["recovered"] or ctx["is_suppressed"] or ctx["decline_class"] == DeclineClass.HARD.value:
        return
    if ctx["failure"].case_type in (CaseType.CHECKOUT_DROP_OFF.value, CaseType.B2B_RECEIVABLE.value):
        return
    f, cfg = ctx["failure"], ctx["config"]
    ctx["case_status"] = CaseStatus.ESCALATED.value
    ctx["recovery_method"] = RecoveryMethod.VOICE.value
    vtime = compute_compliant_voice_time(ctx, cfg)
    execute_voice_call(ctx, f, cfg, vtime)


def stage_finalize_closure(ctx: Dict[str, Any]):
    if ctx["recovered"]:
        return

    f = ctx["failure"]
    d_class = ctx["decline_class"]
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        ctx["case_status"] = CaseStatus.CLOSED.value
        ctx["recovery_method"] = RecoveryMethod.PAYMENT_LINK.value
    elif f.case_type == CaseType.B2B_RECEIVABLE.value:
        ctx["case_status"] = CaseStatus.ESCALATED.value if f.aging_bucket in ("31_60_days", "60_plus_days") else CaseStatus.CLOSED.value
    elif d_class == DeclineClass.HARD.value:
        ctx["case_status"] = CaseStatus.CLOSED.value
        ctx["recovery_method"] = RecoveryMethod.MANUAL.value
    elif ctx["case_status"] not in (CaseStatus.ESCALATED.value, CaseStatus.OPTED_OUT.value):
        ctx["case_status"] = CaseStatus.EXHAUSTED.value

    t_evt = EventType.CASE_EXHAUSTED.value if ctx["case_status"] == CaseStatus.EXHAUSTED.value else EventType.CASE_CLOSED.value
    label = "exhausted" if ctx["case_status"] == CaseStatus.EXHAUSTED.value else "closed"

    ctx["add_dec"](
        "close",
        f"case_{label}_{d_class}",
        f"Case {label}: all recovery channels processed for {f.case_type} '{f.error_reason}'.",
        {"final_status": ctx["case_status"], "decline_class": d_class, "retry_count": ctx["retry_count"]},
    )
    ctx["add_evt"](t_evt, agent="system", notes=f"Case {label}: {f.error_reason}")


# Pipeline dispatch table
PIPELINE = [
    stage_classify_and_init,
    stage_mandate_checks,
    stage_checkout_dropoff_recovery,
    stage_b2b_receivables_dunning,
    stage_auto_retries,
    stage_subscription_halt,
    stage_settlement_and_opt_out_check,
    stage_sms_dunning,
    stage_voice_escalation,
    stage_finalize_closure,
]


def build_engine_context(failure: FailureInput, config: EngineConfig, rng, settled, suppressed, decisions, events):
    created_at = datetime.fromisoformat(failure.created_at)
    ctx = {
        "failure": failure, "config": config, "rng": rng,
        "settled_cases": settled or set(), "suppressed_contacts": suppressed or set(),
        "is_suppressed": False, "current_time": created_at,
        "retry_count": 0, "max_retries": 0, "recovered": False, "recovered_amount": 0,
        "case_status": CaseStatus.OPEN.value, "recovery_method": RecoveryMethod.NONE.value,
        "error_details": config.error_reason_details.get(failure.error_reason, {}),
        "decisions": decisions, "events": events,
    }
    ctx["add_dec"] = lambda act, rule, reas, det=None, ts=None: decisions.append(
        make_decision(failure.case_id, ts or ctx["current_time"].isoformat(), act, rule, reas, det, seq=len(decisions))
    )
    ctx["add_evt"] = lambda etype, ts=None, data=None, amount=0, channel=None, agent=None, notes=None: events.append(
        make_event(failure.case_id, etype, ts or ctx["current_time"].isoformat(), data, amount, channel, agent, notes, seq=len(events))
    )
    return ctx


def decide(
    failure: FailureInput,
    config: Optional[EngineConfig] = None,
    rng=None,
    settled_cases: Optional[Set[str]] = None,
    suppressed_contacts: Optional[Set[str]] = None,
) -> AgentResult:
    if config is None:
        from engine_config import default_payment_config
        config = default_payment_config()
    if rng is None:
        rng = random.Random(42)
    decisions: List[Decision] = []
    events: List[Event] = []
    ctx = build_engine_context(failure, config, rng, settled_cases, suppressed_contacts, decisions, events)
    for stage in PIPELINE:
        stage(ctx)
    return AgentResult(
        failure=failure, decisions=decisions, events=events,
        final_status=ctx["case_status"], recovery_method=ctx["recovery_method"],
        recovered_amount_paise=ctx["recovered_amount"], retry_count=ctx["retry_count"],
    )
