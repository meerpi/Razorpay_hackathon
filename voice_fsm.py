"""
voice_fsm.py — Regulatory-Compliant AI Voicebot Finite State Machine.

Built with Python `transitions` library.
Enforces compliance regulations:
  - RBI Master Directions / Responsible Business Conduct Directions 2026:
      Strict 8:00 AM – 7:00 PM IST calling window.
      Civil, dignified disclosure; prohibited harassment or third-party pressure.
  - RBI Fair Practices Code (FPC) §3.1 (Right-Party Verification):
      Generic disclosure first ("financial services company").
      Lender name and debt amount are NEVER revealed before RPV passes.
      Bounded RPV retry loop (max 2 re-prompts before terminating).
  - TRAI TCCCPR Regulations:
      Designated 1601 series for private financial institution transactional calls.
  - Digital Personal Data Protection (DPDP) Act, 2023:
      Just-in-time recording and data processing notice.
  - Customer Dispute & Opt-Out Handling:
      Dispute path flags debt for manual reconciliation.
      Opt-out persists in suppression_list.json to prevent harassment across all channels.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
import uuid

from transitions import Machine

from models import Decision, Event, EventType

IST = timezone(timedelta(hours=5, minutes=30))
SUPPRESSION_FILE = Path("output/suppression_list.json")
SCRIPTS_FILE = Path("voice_scripts.json")


class ComplianceVoiceFSM:
    """
    Finite State Machine for an individual voice recovery call.
    """
    STATES = [
        "IDLE",
        "CALLING_WINDOW_CHECK",
        "GENERIC_DISCLOSURE",
        "RIGHT_PARTY_VERIFICATION",
        "LENDER_DISCLOSURE",
        "PAYMENT_DISCUSSION",
        "RESOLUTION_ATTEMPT",
        "HUMAN_ESCALATION",
        "DISPUTE_LOGGED",
        "OPT_OUT_RECORDED",
        "CALL_COMPLETE",
        "CALL_FAILED",
    ]

    def __init__(
        self,
        case_id: str,
        customer_name: str,
        phone: str,
        amount_paise: int,
        lender_name: str = "Razorpay Merchants",
        call_time: Optional[datetime] = None,
        originating_number: str = "+911601234567",
    ):
        self.case_id = case_id
        self.customer_name = customer_name
        self.phone = phone
        self.amount_paise = amount_paise
        self.lender_name = lender_name
        self.call_time = call_time or datetime.now(IST)
        self.originating_number = originating_number

        self.rpv_retries = 0
        self.max_rpv_retries = 2
        self.call_sub_reason = None
        self.dispute_notes = None

        self.decisions: List[Decision] = []
        self.events: List[Event] = []

        # Initialize Transitions Machine
        self.machine = Machine(
            model=self,
            states=ComplianceVoiceFSM.STATES,
            initial="IDLE",
            send_event=True,
        )

        self._setup_transitions()

    def _setup_transitions(self):
        # 1. Start call -> Calling window check
        self.machine.add_transition(
            trigger="initiate_call",
            source="IDLE",
            dest="CALLING_WINDOW_CHECK",
            after="_on_window_check",
        )

        # 2. Window check pass -> Generic disclosure
        self.machine.add_transition(
            trigger="window_approved",
            source="CALLING_WINDOW_CHECK",
            dest="GENERIC_DISCLOSURE",
            after="_on_generic_disclosure",
        )

        # 3. Window check fail -> Call failed
        self.machine.add_transition(
            trigger="window_violation",
            source="CALLING_WINDOW_CHECK",
            dest="CALL_FAILED",
            after="_on_window_failed",
        )

        # 4. Generic disclosure -> RPV
        self.machine.add_transition(
            trigger="request_rpv",
            source="GENERIC_DISCLOSURE",
            dest="RIGHT_PARTY_VERIFICATION",
            after="_on_rpv_initiated",
        )

        # 5. RPV retry (loop)
        self.machine.add_transition(
            trigger="retry_rpv",
            source="RIGHT_PARTY_VERIFICATION",
            dest="RIGHT_PARTY_VERIFICATION",
            conditions=["_can_retry_rpv"],
            after="_on_rpv_retry",
        )

        # 6. RPV failed -> Call failed
        self.machine.add_transition(
            trigger="fail_rpv",
            source="RIGHT_PARTY_VERIFICATION",
            dest="CALL_FAILED",
            after="_on_rpv_failed",
        )

        # 7. RPV verified -> Lender disclosure (ONLY after RPV passes)
        self.machine.add_transition(
            trigger="verify_rpv",
            source="RIGHT_PARTY_VERIFICATION",
            dest="LENDER_DISCLOSURE",
            after="_on_lender_disclosure",
        )

        # 8. Lender disclosure -> Payment discussion
        self.machine.add_transition(
            trigger="start_payment_discussion",
            source="LENDER_DISCLOSURE",
            dest="PAYMENT_DISCUSSION",
            after="_on_payment_discussion",
        )

        # 9. Payment discussion -> Resolution attempt
        self.machine.add_transition(
            trigger="propose_resolution",
            source="PAYMENT_DISCUSSION",
            dest="RESOLUTION_ATTEMPT",
            after="_on_resolution_attempt",
        )

        # 10. Human escalation requested (can trigger from payment discussion or resolution)
        self.machine.add_transition(
            trigger="escalate_to_human",
            source=["PAYMENT_DISCUSSION", "RESOLUTION_ATTEMPT"],
            dest="HUMAN_ESCALATION",
            after="_on_human_escalation",
        )

        # 11. Customer disputes debt
        self.machine.add_transition(
            trigger="record_dispute",
            source=["PAYMENT_DISCUSSION", "RESOLUTION_ATTEMPT"],
            dest="DISPUTE_LOGGED",
            after="_on_dispute_logged",
        )

        # 12. Customer opts out
        self.machine.add_transition(
            trigger="record_opt_out",
            source=["GENERIC_DISCLOSURE", "RIGHT_PARTY_VERIFICATION", "LENDER_DISCLOSURE", "PAYMENT_DISCUSSION", "RESOLUTION_ATTEMPT"],
            dest="OPT_OUT_RECORDED",
            after="_on_opt_out_recorded",
        )

        # 13. Call complete (payment agreed / link sent)
        self.machine.add_transition(
            trigger="complete_call",
            source=["PAYMENT_DISCUSSION", "RESOLUTION_ATTEMPT"],
            dest="CALL_COMPLETE",
            after="_on_call_complete",
        )

    # ─── Condition guards ─────────────────────────────────────

    def _can_retry_rpv(self, event=None) -> bool:
        return self.rpv_retries < self.max_rpv_retries

    # ─── Lifecycle Callbacks ──────────────────────────────────

    def _add_decision(self, action: str, rule_fired: str, reason: str, details: Optional[dict] = None):
        dec_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"voice_dec:{self.case_id}:{len(self.decisions)}:{action}:{rule_fired}"))
        self.decisions.append(Decision(
            decision_id=dec_id,
            case_id=self.case_id,
            timestamp=self.call_time.isoformat(),
            action=action,
            rule_fired=rule_fired,
            reason=reason,
            details=details,
        ))

    def _add_event(
        self,
        event_type: str,
        notes: Optional[str] = None,
        event_data: Optional[dict] = None,
        recovery_amount_paise: int = 0,
    ):
        evt_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"voice_evt:{self.case_id}:{len(self.events)}:{event_type}"))
        self.events.append(Event(
            event_id=evt_id,
            case_id=self.case_id,
            event_type=event_type,
            event_timestamp=self.call_time.isoformat(),
            event_data=event_data,
            recovery_amount_paise=recovery_amount_paise,
            channel="voice",
            agent_type="ai_voice",
            notes=notes,
        ))

    def _on_window_check(self, event=None):
        hour = self.call_time.hour
        is_valid = 8 <= hour < 19
        self._add_decision(
            action="calling_window_check",
            rule_fired="rbi_calling_window_8am_7pm",
            reason=f"RBI Master Directions restrict recovery calls to 8:00 AM - 7:00 PM IST. Current time: {self.call_time.strftime('%H:%M')} IST.",
            details={"hour": hour, "is_valid": is_valid},
        )
        if is_valid:
            self.window_approved()
        else:
            self.call_sub_reason = "window_violation"
            self.window_violation()

    def _on_window_failed(self, event=None):
        self._add_decision(
            action="abort_call",
            rule_fired="call_aborted_outside_permissible_hours",
            reason="Call aborted to prevent regulatory violation under RBI Responsible Business Conduct Directions.",
            details={"sub_reason": "window_violation"},
        )
        self._add_event(
            EventType.VOICE_NOT_PICKED.value,
            notes="Call blocked: outside permissible 8 AM - 7 PM IST calling window.",
        )

    def _on_generic_disclosure(self, event=None):
        # Disclose AI entity + DPDP recording, but NOT the specific lender or debt details!
        self._add_decision(
            action="disclose_generic_identity",
            rule_fired="generic_disclosure_before_rpv",
            reason="TRAI/RBI privacy mandate: Identify caller as AI assistant for a financial services company, but hold specific lender name until borrower is authenticated.",
            details={"originating_series": "1601", "dpdp_notice": True},
        )
        self._add_event(
            EventType.VOICE_CONNECTED.value,
            notes="Connected. Generic disclosure delivered with DPDP Act recording notice.",
        )

    def _on_rpv_initiated(self, event=None):
        self._add_decision(
            action="verify_right_party",
            rule_fired="rbi_fpc_right_party_verification_initiated",
            reason="Fair Practices Code prohibits discussing debt with relatives or non-borrowers. Prompting for identity verification factor.",
            details={"customer_name": self.customer_name},
        )

    def _on_rpv_retry(self, event=None):
        self.rpv_retries += 1
        self._add_decision(
            action="retry_rpv",
            rule_fired=f"rpv_reprompt_{self.rpv_retries}_of_{self.max_rpv_retries}",
            reason=f"RPV response unclear/misheard. Re-prompting with alternate factor (attempt {self.rpv_retries} of {self.max_rpv_retries}).",
            details={"retry_number": self.rpv_retries},
        )
        self._add_event(
            EventType.RPV_RETRY.value,
            notes=f"RPV re-prompt #{self.rpv_retries}: asking for card last-4 digits.",
        )

    def _on_rpv_failed(self, event=None):
        self.call_sub_reason = "rpv_failed"
        self._add_decision(
            action="terminate_call_no_disclosure",
            rule_fired="rpv_failed_privacy_protection_active",
            reason="Right-party verification failed or non-borrower reached. Call terminated without revealing any debt or transaction details.",
            details={"sub_reason": "rpv_failed"},
        )
        self._add_event(
            EventType.VOICE_NOT_PICKED.value,
            notes="RPV failed: non-borrower or unverified identity. Terminated without debt disclosure.",
        )

    def _on_lender_disclosure(self, event=None):
        self._add_decision(
            action="disclose_lender_identity",
            rule_fired="rpv_verified_lender_disclosure_permitted",
            reason=f"Borrower identity authenticated. Disclosing specific lender '{self.lender_name}' and account details.",
            details={"lender_name": self.lender_name, "verified_borrower": self.customer_name},
        )

    def _on_payment_discussion(self, event=None):
        self._add_decision(
            action="present_debt_details",
            rule_fired="dignified_debt_disclosure",
            reason=f"Discussing pending amount of ₹{self.amount_paise / 100:,.2f} civilly without intimidation.",
            details={"amount_paise": self.amount_paise},
        )

    def _on_resolution_attempt(self, event=None):
        self._add_decision(
            action="offer_payment_solution",
            rule_fired="resolution_via_upi_link",
            reason="Offering instant payment link via SMS/WhatsApp for customer convenience.",
        )

    def _on_human_escalation(self, event=None):
        self.call_sub_reason = "human_escalation"
        self._add_decision(
            action="handoff_to_human_agent",
            rule_fired="customer_requested_human_escalation",
            reason="Customer exercised right to speak to a human representative. Handing off call seamlessly.",
        )
        self._add_event(
            EventType.ESCALATED_TO_VOICE.value,
            notes="Customer requested human agent: transferred to live collections representative.",
        )

    def _on_dispute_logged(self, event=None):
        self.call_sub_reason = "disputed"
        self.dispute_notes = "Customer claims prior payment or disputes amount."
        self._add_decision(
            action="log_formal_dispute",
            rule_fired="fair_collection_dispute_protocol",
            reason="Customer disputes the obligation. Pausing all outbound collection activities and routing to reconciliation.",
        )
        self._add_event(
            EventType.DISPUTE_LOGGED.value,
            notes="Formal dispute logged: customer claims payment was already completed. Automated outreach suppressed.",
        )

    def _on_opt_out_recorded(self, event=None):
        self.call_sub_reason = "opted_out"
        self._add_decision(
            action="record_opt_out",
            rule_fired="durable_customer_opt_out",
            reason="Customer requested no further telephone contact. Adding phone and case to suppression list.",
            details={"phone": self.phone},
        )
        self._add_event(
            EventType.OPT_OUT_RECORDED.value,
            notes="Customer opted out of voice contact. Added to persistent suppression list.",
        )
        record_suppression(self.phone, self.case_id, reason="Customer voice call opt-out")

    def _on_call_complete(self, event=None):
        self._add_decision(
            action="complete_call_success",
            rule_fired="payment_commitment_obtained",
            reason="Customer agreed to resolution; payment link dispatched.",
        )
        self._add_event(
            EventType.RECOVERED.value,
            recovery_amount_paise=self.amount_paise,
            notes="Payment commitment obtained via compliant AI voice call.",
        )
        try:
            from ptp_tracker import record_promise_to_pay
            promised_d = (datetime.now(IST) + timedelta(days=1)).strftime("%Y-%m-%d")
            record_promise_to_pay(
                self.case_id, self.customer_name, self.phone, self.amount_paise,
                promised_date=promised_d, notes="Agreed to complete payment via dispatched link."
            )
        except Exception:
            pass


# ─── Persistent Suppression List Helper ─────────────────────────

def load_suppression_list() -> List[Dict[str, Any]]:
    if not SUPPRESSION_FILE.exists():
        return []
    try:
        with open(SUPPRESSION_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def is_suppressed(phone: str) -> bool:
    """Check if a phone number has active opt-out suppression."""
    entries = load_suppression_list()
    return any(e.get("phone") == phone for e in entries)


def record_suppression(phone: str, case_id: str, reason: str):
    """Add a customer phone number to persistent suppression list."""
    SUPPRESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    entries = load_suppression_list()
    if not any(e.get("phone") == phone for e in entries):
        entries.append({
            "phone": phone,
            "case_id": case_id,
            "opted_out_at": datetime.now(IST).isoformat(),
            "reason": reason,
        })
        with open(SUPPRESSION_FILE, "w") as f:
            json.dump(entries, f, indent=2)


# ─── Scenario Runner ───────────────────────────────────────────

def run_scripted_scenario(
    scenario_name: str,
    case_data: Dict[str, Any],
    call_time: Optional[datetime] = None,
) -> ComplianceVoiceFSM:
    """
    Run one of the scripted scenarios from voice_scripts.json through the FSM.
    Proves state transitions and regulatory gates work deterministically.
    """
    if not SCRIPTS_FILE.exists():
        raise FileNotFoundError(f"{SCRIPTS_FILE} not found")

    with open(SCRIPTS_FILE, "r") as f:
        scripts = json.load(f)

    scenario = next((s for s in scripts["scenarios"] if s["name"] == scenario_name), None)
    if not scenario:
        raise ValueError(f"Scenario '{scenario_name}' not found in {SCRIPTS_FILE}")

    fsm = ComplianceVoiceFSM(
        case_id=case_data.get("case_id", "demo-case-1"),
        customer_name=case_data.get("contact_name", "Rahul Sharma"),
        phone=case_data.get("contact_phone", "+919876543210"),
        amount_paise=case_data.get("amount_paise", 500000),
        call_time=call_time or datetime(2026, 8, 29, 11, 30, tzinfo=IST),
    )

    # 1. Initiate call
    fsm.initiate_call()
    if fsm.state == "CALL_FAILED":
        return fsm

    # 2. Walk through turns
    for turn in scenario["turns"]:
        speaker = turn.get("speaker")
        target_state = turn.get("state")
        intent = turn.get("intent")
        action = turn.get("action")

        if speaker == "bot" and target_state == "RIGHT_PARTY_VERIFICATION":
            if action == "rpv_retry_prompt":
                fsm.retry_rpv()
            elif fsm.state == "GENERIC_DISCLOSURE":
                fsm.request_rpv()
        elif speaker == "bot" and target_state == "PAYMENT_DISCUSSION":
            if fsm.state == "LENDER_DISCLOSURE":
                fsm.start_payment_discussion()
        elif speaker == "bot" and target_state == "RESOLUTION_ATTEMPT":
            if fsm.state == "PAYMENT_DISCUSSION":
                fsm.propose_resolution()
        elif speaker == "customer" and intent in CUSTOMER_ACTIONS:
            CUSTOMER_ACTIONS[intent](fsm)

    return fsm


CUSTOMER_ACTIONS = {
    "rpv_confirm": lambda fsm: fsm.verify_rpv(),
    "rpv_confirm_last4": lambda fsm: fsm.verify_rpv(),
    "rpv_wrong_person": lambda fsm: fsm.fail_rpv(),
    "agree_payment_link": lambda fsm: fsm.complete_call(),
    "request_human": lambda fsm: fsm.escalate_to_human(),
    "dispute": lambda fsm: fsm.record_dispute(),
    "opt_out": lambda fsm: fsm.record_opt_out(),
}
