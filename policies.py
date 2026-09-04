"""
policies.py — Comparative Policy Evaluators for AI Revenue Recovery.

Adheres strictly to codecrafters-shell-python/app/main.py:
  - Flat, concise procedural functions (15-20 lines max).
  - Zero bloated class hierarchies or OOP boilerplate.
  - Modular helper functions dispatched cleanly.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple, List
import uuid

from models import (
    FailureInput, PolicyResult, Decision, Event,
    DeclineClass, CaseStatus, EventType, CaseType
)
from constants import (
    HARD_DECLINE_REASONS, TECHNICAL_DECLINE_REASONS,
    EXCESSIVE_AUTH_PENALTY_INR,
    SMS_COST_INR, WHATSAPP_COST_INR, VOICE_COST_PER_MIN_INR,
    GATEWAY_PROCESSING_FEE_RATE, ERROR_REASON_ISO_MAP,
)
from razorpay_client import create_payment_link
from voice_fsm import is_suppressed
from timing_engine import predict_optimal_retry_slot

IST = timezone(timedelta(hours=5, minutes=30))


def classify_decline_reason(reason: str) -> str:
    if reason in HARD_DECLINE_REASONS:
        return DeclineClass.HARD.value
    if reason in TECHNICAL_DECLINE_REASONS:
        return DeclineClass.TECHNICAL.value
    return DeclineClass.SOFT.value


def is_within_rbi_window(dt: datetime) -> bool:
    return 8 <= dt.hour < 19


def make_decision_atom(case_id: str, ts: str, action: str, rule: str, reason: str, details=None) -> Decision:
    dec_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"dec:{case_id}:{action}:{rule}:{ts}"))
    return Decision(
        decision_id=dec_id,
        case_id=case_id,
        timestamp=ts,
        action=action,
        rule_fired=rule,
        reason=reason,
        details=details or {},
    )


def make_event_atom(case_id: str, etype: str, ts: str, amount=0, channel="system", notes=None) -> Event:
    evt_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"evt:{case_id}:{etype}:{ts}:{amount}"))
    return Event(
        event_id=evt_id,
        case_id=case_id,
        event_type=etype,
        event_timestamp=ts,
        recovery_amount_paise=amount,
        channel=channel,
        notes=notes,
    )


def apply_control_retries(f: FailureInput, d_class: str, dt: datetime, decisions: list, events: list) -> int:
    penalty_paise = 0
    iso_info = ERROR_REASON_ISO_MAP.get(f.error_reason, {})
    iso_code = iso_info.get("iso_code", "14")
    for attempt in range(1, 4):
        if d_class == DeclineClass.HARD.value:
            penalty_paise += int(EXCESSIVE_AUTH_PENALTY_INR * 100)
            decisions.append(make_decision_atom(
                f.case_id, dt.isoformat(), "excessive_retry", "naive_blind_retry_hard_decline",
                f"Blind retry #{attempt} on ISO 8583 Code {iso_code} (Cat 1) '{f.error_reason}'. Incurred penalty.",
                {"attempt": attempt, "penalty_inr": EXCESSIVE_AUTH_PENALTY_INR, "iso_code": iso_code}
            ))
            events.append(make_event_atom(f.case_id, EventType.PENALTY_FEE_INCURRED.value, dt.isoformat(), amount=int(EXCESSIVE_AUTH_PENALTY_INR * 100)))
        else:
            decisions.append(make_decision_atom(
                f.case_id, dt.isoformat(), "retry", "naive_retry_attempt", f"Naive retry attempt #{attempt}.", {"attempt": attempt}
            ))
    return penalty_paise


def apply_control_compliance(f: FailureInput, dt: datetime, decisions: list, events: list) -> int:
    violations = 0
    if not is_within_rbi_window(dt):
        violations += 1
        decisions.append(make_decision_atom(
            f.case_id, dt.isoformat(), "outreach", "naive_off_hours_contact",
            f"Contact attempted at {dt.strftime('%H:%M')} IST. Breached RBI window."
        ))
        events.append(make_event_atom(f.case_id, EventType.COMPLIANCE_BREACH_LOGGED.value, dt.isoformat()))
    violations += 1
    decisions.append(make_decision_atom(f.case_id, dt.isoformat(), "disclosure", "naive_no_rpv_disclosure", "Disclosed debt without RPV."))
    return violations


def resolve_control_outcome(f: FailureInput, d_class: str, rng) -> Tuple[str, int]:
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        recovered = rng.random() < 0.08
    elif f.case_type == CaseType.B2B_RECEIVABLE.value:
        recovered = rng.random() < 0.35
    else:
        recovered = (rng.random() < 0.22) if d_class != DeclineClass.HARD.value else False
    return (CaseStatus.RECOVERED.value, f.amount_paise) if recovered else (CaseStatus.EXHAUSTED.value, 0)


def compute_control_costs(rec_amount: int) -> Tuple[int, int]:
    comm_paise = int(2 * SMS_COST_INR * 100)
    interchange_paise = int(rec_amount * GATEWAY_PROCESSING_FEE_RATE)
    return comm_paise, interchange_paise


def evaluate_control_case(f: FailureInput, config, rng) -> PolicyResult:
    decisions, events = [], []
    d_class = classify_decline_reason(f.error_reason)
    dt = datetime.fromisoformat(f.created_at)

    penalties = apply_control_retries(f, d_class, dt, decisions, events)
    violations = apply_control_compliance(f, dt, decisions, events)
    status, rec_amount = resolve_control_outcome(f, d_class, rng)
    comm_paise, inter_paise = compute_control_costs(rec_amount)

    return PolicyResult(
        "control_naive_merchant", f.case_id, status, rec_amount, 3, penalties, violations,
        comm_cost_paise=comm_paise, interchange_cost_paise=inter_paise,
        decisions=decisions, events=events
    )


def apply_treatment_stopping_rule(f: FailureInput, d_class: str, dt: datetime, decisions: list):
    if d_class == DeclineClass.HARD.value:
        iso_info = ERROR_REASON_ISO_MAP.get(f.error_reason, {})
        iso_code = iso_info.get("iso_code", "54")
        decisions.append(make_decision_atom(
            f.case_id, dt.isoformat(), "stop_retries", "visa_mastercard_cat1_stopping_rule",
            f"ISO 8583 Code {iso_code} (Category 1) hard decline '{f.error_reason}' stopped (0 retries). Avoided penalties.",
            {"iso_code": iso_code, "category": 1}
        ))


def get_link_metadata(f: FailureInput) -> Tuple[str, str]:
    """Return tailored link description and decision rule based on case type."""
    if f.case_type == CaseType.SUBSCRIPTION.value:
        return f"Update Payment Method for Subscription {f.sub_id or f.case_id}", "subscription_update_link_created"
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        return "Complete Your Abandoned Checkout Order", "checkout_dropoff_recovery_link_created"
    if f.case_type == CaseType.B2B_RECEIVABLE.value:
        return f"Pay B2B Invoice {f.invoice_id or f.case_id} ({f.company_name or 'Corporate'})", "b2b_invoice_payment_link_created"
    return f"Recovery link ({f.error_reason})", "razorpay_payment_link_created"


def apply_treatment_link(f: FailureInput, dt: datetime, rzp_client, live_link: bool, decisions: list, events: list) -> Optional[str]:
    if not (live_link and rzp_client):
        return None
    desc, rule = get_link_metadata(f)
    res = create_payment_link(
        rzp_client, f.amount_paise, desc,
        {"name": f.contact_name, "email": f.contact_email, "phone": f.contact_phone}
    )
    url = res.get("short_url") if res else None
    if url:
        decisions.append(make_decision_atom(f.case_id, dt.isoformat(), "generate_link", rule, f"Live link ({desc}): {url}"))
        events.append(make_event_atom(f.case_id, EventType.PAYMENT_LINK_CREATED.value, dt.isoformat(), notes=url))
    return url


def apply_treatment_compliance(f: FailureInput, dt: datetime, decisions: list) -> datetime:
    call_dt = dt if is_within_rbi_window(dt) else dt.replace(hour=8, minute=30, second=0)
    if call_dt != dt:
        decisions.append(make_decision_atom(f.case_id, call_dt.isoformat(), "schedule_contact", "rbi_window_shift_8am", "Shifted to RBI 8am-7pm window."))
    decisions.append(make_decision_atom(f.case_id, call_dt.isoformat(), "rpv_gate", "rbi_rpv_verified", "Identity verified via RPV."))
    return call_dt


def resolve_treatment_outcome(f: FailureInput, d_class: str, rng, dt: datetime, decisions: list, events: list) -> Tuple[str, int]:
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        stage = f.checkout_stage or "cart_abandoned"
        prob = 0.32 if stage == "otp_abandoned" else (0.25 if stage == "payment_method_selected" else 0.18)
    elif f.case_type == CaseType.B2B_RECEIVABLE.value:
        bucket = f.aging_bucket or "current"
        prob = 0.95 if bucket == "current" else (0.75 if bucket == "1_15_days" else (0.52 if bucket == "16_30_days" else 0.30))
    else:
        tenure = len(f.history)
        prob = (0.54 if tenure >= 5 else 0.40) if d_class != DeclineClass.HARD.value else 0.18
    recovered = rng.random() < prob
    rec_amount = f.amount_paise if recovered else 0
    status = CaseStatus.RECOVERED.value if recovered else CaseStatus.CLOSED.value
    if recovered:
        events.append(make_event_atom(f.case_id, EventType.RECOVERED.value, dt.isoformat(), amount=rec_amount))
        det = {"recovered_amount_paise": rec_amount, "policy": "treatment_autonomous_recovery"}
        decisions.append(make_decision_atom(f.case_id, dt.isoformat(), "recover", "ai_agent_recovered", f"Recovered ₹{rec_amount/100:,.2f}", det))
    return status, rec_amount


def compute_treatment_costs(f: FailureInput, rec_amount: int, d_class: str) -> Tuple[int, int]:
    if f.case_type == CaseType.CHECKOUT_DROP_OFF.value:
        comm_paise = int(WHATSAPP_COST_INR * 100)
    elif f.case_type == CaseType.B2B_RECEIVABLE.value:
        comm_paise = 0
    else:
        comm_paise = int(SMS_COST_INR * 100) if d_class != DeclineClass.HARD.value else 0
    interchange_paise = int(rec_amount * GATEWAY_PROCESSING_FEE_RATE)
    return comm_paise, interchange_paise


def evaluate_treatment_case(f: FailureInput, config, rng, rzp_client=None, live_link=False) -> PolicyResult:
    decisions, events = [], []
    d_class = classify_decline_reason(f.error_reason)
    dt = datetime.fromisoformat(f.created_at)

    if is_suppressed(f.contact_phone):
        decisions.append(make_decision_atom(f.case_id, dt.isoformat(), "suppress", "customer_opted_out", "Customer opted out. Contact ceased."))
        events.append(make_event_atom(f.case_id, EventType.OPT_OUT_RECORDED.value, dt.isoformat()))
        return PolicyResult("treatment_ai_agent", f.case_id, CaseStatus.OPTED_OUT.value, 0, 0, 0, 0, decisions=decisions, events=events)

    apply_treatment_stopping_rule(f, d_class, dt, decisions)
    slot = predict_optimal_retry_slot(f)
    decisions.append(make_decision_atom(f.case_id, dt.isoformat(), "schedule_retry", "bayesian_timing_slot_scheduled", f"Target day {slot['target_day']} (tenure {slot['tenure']}, weight {slot['shrinkage_weight']}). CBS safe: {slot['cbs_safe']}."))
    url = apply_treatment_link(f, dt, rzp_client, live_link, decisions, events)
    call_dt = apply_treatment_compliance(f, dt, decisions)
    status, rec_amount = resolve_treatment_outcome(f, d_class, rng, call_dt, decisions, events)
    comm_paise, inter_paise = compute_treatment_costs(f, rec_amount, d_class)

    return PolicyResult(
        "treatment_ai_agent", f.case_id, status, rec_amount, 0 if d_class == DeclineClass.HARD.value else 1,
        0, 0, url, comm_cost_paise=comm_paise, interchange_cost_paise=inter_paise,
        decisions=decisions, events=events
    )
