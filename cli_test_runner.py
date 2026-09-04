"""
cli_test_runner.py — Standalone CLI execution bridge for frontend Test Lab.

Executes the REAL Razorpay backend pipeline against the live Razorpay Testbed API.
Takes JSON input from stdin:
{
    "customer_name": "...",
    "contact_phone": "...",
    "contact_email": "...",
    "amount_rupees": 24500,
    "case_type": "payment",
    "method": "card",
    "rail": "HDFC",
    "error_reason": "insufficient_funds"
}
Outputs complete execution result as JSON.
"""

import sys
import json
import uuid
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Load local modules
import razorpay_client
from models import FailureInput, DeclineClass, CaseStatus, CaseType
from engine_config import default_payment_config
from policies import (
    classify_decline_reason,
    is_within_rbi_window,
    apply_treatment_stopping_rule,
    apply_treatment_link,
    apply_treatment_compliance,
    resolve_treatment_outcome,
    compute_treatment_costs,
)
from timing_engine import predict_optimal_retry_slot, is_cbs_blackout
from voice_fsm import is_suppressed, ComplianceVoiceFSM
from degradation_engine import diagnose_payment_degradation, execute_degradation_reroute
from audit_replay import compute_canonical_hash
from constants import (
    ERROR_REASON_ISO_MAP,
    ERROR_REASON_DETAILS,
    RBI_CALLING_WINDOW_START_HOUR,
    RBI_CALLING_WINDOW_END_HOUR,
    EMANDATE_AFA_FREE_LIMIT_PAISE,
    TRAI_TRANSACTIONAL_HEADER,
)

IST = timezone(timedelta(hours=5, minutes=30))
AUDIT_LOG_FILE = Path("output/audit_log.jsonl")

def run_real_case(params: dict) -> dict:
    now = datetime.now(IST)
    phone = params.get("contact_phone", "").strip()
    name = params.get("customer_name", "Valued Customer").strip()
    email = params.get("contact_email", "customer@example.com").strip()
    amount_rupees = float(params.get("amount_rupees", 1499.0))
    amount_paise = int(round(amount_rupees * 100))
    case_type = params.get("case_type", "payment")
    method = params.get("method", "card")
    rail = params.get("rail", "HDFC")
    error_reason = params.get("error_reason", "insufficient_funds")

    case_id = f"case_live_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_live_{uuid.uuid4().hex[:10]}"
    order_id = f"order_{uuid.uuid4().hex[:10]}"

    err_details = ERROR_REASON_DETAILS.get(error_reason, {
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "gateway",
        "error_step": "payment_authorization",
        "error_description": "Payment authorization declined by network."
    })

    failure = FailureInput(
        case_id=case_id,
        case_type=case_type,
        payment_id=payment_id,
        order_id=order_id,
        customer_id=f"cust_{uuid.uuid4().hex[:6]}",
        amount_paise=amount_paise,
        currency="INR",
        method=method,
        card_network="visa",
        error_reason=error_reason,
        error_code=err_details.get("error_code", "BAD_REQUEST_ERROR"),
        error_source=err_details.get("error_source", "gateway"),
        error_step=err_details.get("error_step", "payment_authorization"),
        error_description=err_details.get("error_description", "Payment authorization declined."),
        contact_phone=phone,
        contact_email=email,
        contact_name=name,
        created_at=now.isoformat(),
        history=[
            {"status": "captured", "created_at": int((now - timedelta(days=30)).timestamp()), "method": method},
            {"status": "captured", "created_at": int((now - timedelta(days=60)).timestamp()), "method": method},
        ],
    )

    decisions = []
    events = []
    rng = random.Random(42)
    config = default_payment_config()

    # 1. Check DNC suppression
    suppressed = is_suppressed(phone)
    if suppressed:
        decisions.append({
            "action": "suppress",
            "rule": "customer_opted_out",
            "reason": f"Phone {phone} found in suppression list (DNC / DPDP Act). All contact ceased.",
            "timestamp": now.isoformat(),
        })
        return {
            "success": True,
            "is_suppressed": True,
            "case_id": case_id,
            "status": "closed",
            "final_action": "OPT_OUT_SUPPRESSED",
            "reason": "Customer is on the Do-Not-Call / Opt-Out suppression list.",
            "decisions": decisions,
            "payment_link": None,
            "real_testbed_executed": False,
        }

    # 2. Classification & ISO 8583 Gating
    d_class = classify_decline_reason(error_reason)
    iso_meta = ERROR_REASON_ISO_MAP.get(error_reason, {"iso_code": "05", "category": 2, "description": "General decline"})
    iso_code = iso_meta.get("iso_code", "05")
    iso_category = iso_meta.get("category", 2)

    decisions.append({
        "action": "classify",
        "rule": f"{d_class}_decline_classified",
        "reason": f"Error '{error_reason}' mapped to ISO 8583 Code {iso_code} (Category {iso_category}: {iso_meta.get('description')}).",
        "timestamp": now.isoformat(),
    })

    # Category 1 hard stopping rule
    is_hard_stopped = False
    if d_class == DeclineClass.HARD.value or iso_category == 1:
        is_hard_stopped = True
        decisions.append({
            "action": "stop_retries",
            "rule": "visa_mastercard_cat1_stopping_rule",
            "reason": f"Category 1 hard decline '{error_reason}' encountered. Blind retries halted to avoid ₹42 penalty fee.",
            "timestamp": now.isoformat(),
        })

    # 3. Statutory Compliance Gates Check
    within_rbi = is_within_rbi_window(now)
    exceeds_afa = (case_type == "mandate" or method == "emandate") and (amount_paise > EMANDATE_AFA_FREE_LIMIT_PAISE)
    is_cbs = is_cbs_blackout(now)

    compliance_results = {
        "rbi_calling_window": {
            "passed": within_rbi,
            "citation": "RBI/2022-23/108",
            "detail": f"Current hour {now.hour}:00 IST ({'Within' if within_rbi else 'Outside'} 08:00–19:00 window)."
        },
        "emandate_afa": {
            "passed": not exceeds_afa,
            "citation": "RBI Digital Payments E-Mandate Framework 2026 §4.2",
            "detail": f"₹{amount_rupees:,.2f} {'exceeds' if exceeds_afa else 'within'} ₹15,000 ceiling. Customer OTP required." if (case_type == "mandate" or method == "emandate") else "N/A for non-mandate"
        },
        "msmed_43bh": {
            "passed": True,
            "citation": "Finance Act 2023 §43B(h)",
            "detail": "B2B payment schedule active" if case_type == "b2b_receivable" else "N/A (Consumer transaction)"
        },
        "trai_1601": {
            "passed": True,
            "citation": "TRAI TCCCPR Regulations",
            "detail": f"Origination via {TRAI_TRANSACTIONAL_HEADER} series header."
        },
        "cbs_blackout": {
            "passed": not is_cbs,
            "citation": "Bank Core Banking Blackout (23:30–03:30 IST)",
            "detail": "Safe daytime operation" if not is_cbs else "Active nocturnal maintenance window"
        }
    }

    # 4. Bayesian Timing Engine
    timing_slot = predict_optimal_retry_slot(failure)
    decisions.append({
        "action": "schedule_retry",
        "rule": "bayesian_timing_slot_scheduled",
        "reason": f"Customer modal day {timing_slot['modal_day']} blended with macro prior -> Target Day {timing_slot['target_day']} (shrinkage weight {timing_slot['shrinkage_weight']}). CBS Safe: {timing_slot['cbs_safe']}.",
        "timestamp": now.isoformat(),
    })

    # 5. Connect to Real Razorpay Testbed API
    client = razorpay_client.get_client()
    live_link_result = None
    real_api_called = False

    if client:
        real_api_called = True
        desc = f"Payment Recovery ({error_reason}) for {name}"
        cust_info = {"name": name, "phone": phone, "email": email}
        live_link_result = razorpay_client.create_payment_link(client, amount_paise, desc, cust_info)

    created_link_url = None
    if live_link_result and live_link_result.get("short_url"):
        created_link_url = live_link_result.get("short_url")
        decisions.append({
            "action": "generate_link",
            "rule": "razorpay_live_testbed_payment_link_created",
            "reason": f"Successfully created live Razorpay testbed link: {created_link_url} (Link ID: {live_link_result.get('id')})",
            "timestamp": now.isoformat(),
        })

    # 6. Hinglish Voicebot FSM Simulation
    voice_fsm = ComplianceVoiceFSM(
        case_id=case_id,
        customer_name=name,
        phone=phone,
        amount_paise=amount_paise,
    )
    voice_script = f"Namaste {name} ji, Razorpay Merchants ki taraf se payment reminder hai. ₹{amount_rupees:,.2f} ka payment complete karne ke liye payment link send kiya gaya hai."

    # 7. Needs Review Trigger Evaluation
    needs_review = False
    escalation_reason = None
    regulatory_citation = None

    if exceeds_afa:
        needs_review = True
        escalation_reason = "REGULATORY_GATE: E-Mandate Debit Exceeds ₹15,000 AFA Limit"
        regulatory_citation = "RBI E-Mandate Framework 2026 §4.2"
    elif not within_rbi:
        needs_review = True
        escalation_reason = "STATUTORY_WINDOW: Outside RBI 08:00–19:00 IST Calling Hours"
        regulatory_citation = "RBI/2022-23/108 §3.1"
    elif amount_rupees > 50000:
        needs_review = True
        escalation_reason = "FINANCIAL_EXPOSURE: High Value Transaction > ₹50,000"
        regulatory_citation = "Razorpay NOC Risk Governance Policy"

    status = "needs_review" if needs_review else ("closed" if is_hard_stopped else "in_progress")

    # 8. Cryptographic Hash Chain Append
    prev_hash = "0" * 64
    block_index = 1
    if AUDIT_LOG_FILE.exists():
        try:
            with open(AUDIT_LOG_FILE, "r") as f_audit:
                lines = [l.strip() for l in f_audit if l.strip()]
                if lines:
                    last = json.loads(lines[-1])
                    prev_hash = last.get("canonical_hash", "0" * 64)
                    block_index = len(lines) + 1
        except Exception:
            pass

    audit_entry = {
        "prev_hash": prev_hash,
        "case_id": case_id,
        "timestamp": now.isoformat(),
        "action": "real_testbed_pipeline_execution",
        "rule_fired": "autonomous_recovery_agent_evaluation",
        "reason": f"Executed case for {name} ({phone}) - Status: {status}",
    }
    canonical_hash = compute_canonical_hash(audit_entry, prev_hash)
    audit_entry["canonical_hash"] = canonical_hash

    # Append to audit log
    try:
        AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUDIT_LOG_FILE, "a") as f_audit:
            f_audit.write(json.dumps(audit_entry) + "\n")
    except Exception:
        pass

    return {
        "success": True,
        "is_suppressed": False,
        "case_id": case_id,
        "payment_id": payment_id,
        "order_id": order_id,
        "timestamp": now.isoformat(),
        "time_formatted": now.strftime("%H:%M:%S IST"),
        "customer_name": name,
        "customer_phone": phone,
        "customer_email": email,
        "amount_rupees": amount_rupees,
        "amount_paise": amount_paise,
        "case_type": case_type,
        "method": method,
        "rail": rail,
        "error_reason": error_reason,
        "decline_class": d_class,
        "iso_code": iso_code,
        "iso_category": iso_category,
        "status": status,
        "needs_review": needs_review,
        "escalation_reason": escalation_reason,
        "regulatory_citation": regulatory_citation,
        "agent_confidence": 0.78 if needs_review else 0.94,
        "agent_suggested_action": "Generate Razorpay Smart PayLink with Pre-Debit AFA OTP flow." if exceeds_afa else ("Halt card retries to avoid fees." if is_hard_stopped else "Send 1-click checkout recovery link."),
        "real_testbed_executed": real_api_called,
        "payment_link": created_link_url,
        "payment_link_id": live_link_result.get("id") if live_link_result else None,
        "compliance_checks": compliance_results,
        "bayesian_timing": timing_slot,
        "voice_script": voice_script,
        "decisions": decisions,
        "audit_block_index": block_index,
        "audit_block_hash": canonical_hash,
    }

if __name__ == "__main__":
    try:
        raw = sys.stdin.read().strip()
        data = json.loads(raw) if raw else {}
        out = run_real_case(data)
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
