"""
models.py — Data classes for the AI Revenue Recovery system.

Schema derived from real Razorpay API payment entity fields
(https://razorpay.com/docs/build/llm-docs/api/payments.md)
and subscription entity fields
(https://razorpay.com/docs/build/llm-docs/payments/subscriptions/states.md).

v2: Added FailureInput (raw failure, no outcome), Decision (audit trail atom),
    AgentResult (engine output), and expanded EventType/CaseStatus enums for
    mandate compliance, RPV retry, dispute, opt-out, and settlement detection.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List
import json


# ─── Enums ─────────────────────────────────────────────────────

class CaseType(str, Enum):
    PAYMENT = "payment"
    SUBSCRIPTION = "subscription"
    MANDATE = "mandate"
    VOICE_ESCALATION = "voice_escalation"
    CHECKOUT_DROP_OFF = "checkout_drop_off"
    B2B_RECEIVABLE = "b2b_receivable"


class DeclineClass(str, Enum):
    HARD = "hard"
    SOFT = "soft"
    TECHNICAL = "technical"


class CaseStatus(str, Enum):
    OPEN = "open"
    RETRYING = "retrying"
    RECOVERED = "recovered"
    EXHAUSTED = "exhausted"
    ESCALATED = "escalated"
    CLOSED = "closed"
    OPTED_OUT = "opted_out"         # Customer requested no further contact
    DISPUTED = "disputed"           # Customer disputes the debt; flagged for manual review
    PTP_AGREED = "ptp_agreed"       # Customer made a Promise-to-Pay


class RecoveryMethod(str, Enum):
    AUTO_RETRY = "auto_retry"
    SMS = "sms"
    EMAIL = "email"
    VOICE = "voice"
    MANUAL = "manual"
    PAYMENT_LINK = "payment_link"
    NONE = "none"


class EventType(str, Enum):
    # ─── Core payment lifecycle ───
    PAYMENT_FAILED = "payment_failed"
    RETRY_ATTEMPTED = "retry_attempted"
    RETRY_SUCCEEDED = "retry_succeeded"
    RETRY_FAILED = "retry_failed"
    RECOVERED = "recovered"
    CASE_EXHAUSTED = "case_exhausted"
    CASE_CLOSED = "case_closed"

    # ─── Escalation & Interventions ───
    ESCALATED_TO_SMS = "escalated_to_sms"
    ESCALATED_TO_EMAIL = "escalated_to_email"
    ESCALATED_TO_VOICE = "escalated_to_voice"
    PAYMENT_LINK_CREATED = "payment_link_created"

    # ─── Voice lifecycle ───
    VOICE_ATTEMPTED = "voice_attempted"
    VOICE_CONNECTED = "voice_connected"
    VOICE_NOT_PICKED = "voice_not_picked"
    RPV_RETRY = "rpv_retry"                         # Right-party verification re-prompt

    # ─── Subscription lifecycle ───
    SUBSCRIPTION_PENDING = "subscription_pending"
    SUBSCRIPTION_HALTED = "subscription_halted"

    # ─── Mandate / e-mandate compliance (RBI 2026 framework) ───
    MANDATE_FAILED = "mandate_failed"
    PRE_DEBIT_NOTIFICATION = "pre_debit_notification"   # 24h before debit (RBI req)
    POST_DEBIT_CONFIRMATION = "post_debit_confirmation" # After successful debit (RBI req)
    AFA_REQUIRED = "afa_required"                       # Amount exceeds AFA-free threshold

    # ─── Checkout drop-off lifecycle ───
    CHECKOUT_DROPOFF_DETECTED = "checkout_dropoff_detected"
    CHECKOUT_LINK_DISPATCHED = "checkout_link_dispatched"

    # ─── B2B Receivables & Aging Cadence ───
    B2B_INVOICE_ISSUED = "b2b_invoice_issued"
    B2B_AP_REMINDER_SENT = "b2b_ap_reminder_sent"
    B2B_AP_NOTICE_SENT = "b2b_ap_notice_sent"
    B2B_CFO_ESCALATED = "b2b_cfo_escalated"
    B2B_MSME_NOTICE_SERVED = "b2b_msme_notice_served"
    B2B_INVOICE_SETTLED = "b2b_invoice_settled"

    # ─── Customer actions & Policy tracking ───
    DISPUTE_LOGGED = "dispute_logged"               # Customer disputes the charge
    OPT_OUT_RECORDED = "opt_out_recorded"           # Customer requests no further contact
    SETTLEMENT_DETECTED = "settlement_detected"     # Out-of-band payment detected
    PROMISE_TO_PAY_LOGGED = "promise_to_pay_logged" # PTP scheduled
    PENALTY_FEE_INCURRED = "penalty_fee_incurred"   # Network excessive auth penalty
    COMPLIANCE_BREACH_LOGGED = "compliance_breach_logged" # Calling window or RPV breach


# ─── Legacy Case dataclass (used by existing generator output) ──

@dataclass
class Case:
    """
    Recovery case — schema derived from Razorpay payment entity fields.

    Fields map to real API response fields where possible:
    - razorpay_payment_id → payment.id
    - error_source → payment.error_source
    - error_step → payment.error_step
    - error_reason → payment.error_reason
    - method → payment.method
    """
    case_id: str                        # UUID — our internal ID
    case_type: str                      # CaseType value
    razorpay_payment_id: str            # pay_xxx (from payment entity)
    razorpay_order_id: str              # order_xxx
    razorpay_sub_id: Optional[str]      # sub_xxx (subscription cases)
    razorpay_token_id: Optional[str]    # token_xxx (mandate/recurring)
    razorpay_customer_id: str           # cust_xxx
    amount_paise: int                   # in paise (from payment entity)
    currency: str                       # default INR
    method: str                         # card/upi/netbanking/wallet/emandate
    card_network: Optional[str]         # visa/mastercard/rupay (if card)
    error_code: str                     # BAD_REQUEST_ERROR / GATEWAY_ERROR
    error_source: str                   # customer/gateway/issuer_bank/...
    error_step: str                     # payment_initiation/.../payment_authorization
    error_reason: str                   # insufficient_funds/card_declined/etc
    error_description: str              # human-readable
    decline_class: str                  # hard/soft/technical
    subscription_status: Optional[str]  # active/pending/halted/...
    retry_count: int                    # current retry count
    max_retries: int                    # derived from decline_class + case_type
    created_at: str                     # ISO 8601
    last_attempt_at: str                # ISO 8601
    next_retry_at: Optional[str]        # ISO 8601
    case_status: str                    # open/retrying/recovered/exhausted/escalated
    recovery_method: str                # auto_retry/sms/voice/manual/none
    recovered_amount_paise: int         # 0 until recovered
    contact_phone: str
    contact_email: str
    invoice_id: Optional[str] = None    # inv_xxx (for B2B)
    company_name: Optional[str] = None  # Corporate name (for B2B)
    gstin: Optional[str] = None         # 15-char GSTIN
    aging_bucket: Optional[str] = None  # current/1_15_days/16_30_days/etc.
    checkout_stage: Optional[str] = None # cart_abandoned/otp_abandoned/etc.

    def to_dict(self) -> dict:
        return asdict(self)

    def to_csv_row(self) -> dict:
        """Flat dict for CSV export."""
        d = self.to_dict()
        # Convert amount to rupees for dashboard readability
        d["amount_rupees"] = d["amount_paise"] / 100
        d["recovered_amount_rupees"] = d["recovered_amount_paise"] / 100
        return d


# ─── Event (append-only log entry) ─────────────────────────────

@dataclass
class Event:
    """
    Append-only event log entry.

    The event log IS the audit trail — it's not bolted on after.
    Each case generates a sequence of events that fully describe
    its lifecycle from initial failure through recovery or exhaustion.
    """
    event_id: str                       # UUID
    case_id: str                        # FK to Case
    event_type: str                     # EventType value
    event_timestamp: str                # ISO 8601
    event_data: Optional[dict] = None   # Structured context
    recovery_amount_paise: int = 0      # paise recovered (if applicable)
    channel: Optional[str] = None       # auto_retry/sms/email/voice
    agent_type: Optional[str] = None    # system/ai_voice/human
    notes: Optional[str] = None         # Hinglish message if voice, error if retry
    prev_hash: Optional[str] = None     # SHA-256 hash of preceding record (hash chain)
    canonical_hash: Optional[str] = None # SHA-256 of this canonical event payload

    def to_dict(self) -> dict:
        return asdict(self)

    def to_jsonl(self) -> str:
        d = asdict(self)
        if d.get("event_data") and isinstance(d["event_data"], dict):
            pass  # already a dict, json.dumps will handle it
        return json.dumps(d, default=str)


# ─── FailureInput (raw failure — no outcome, no decisions) ──────

@dataclass
class FailureInput:
    """
    Raw failure facts — no outcome, no decisions yet.

    This is what the decision engine receives as input. It contains
    everything needed to make a recovery decision, but no pre-baked
    outcome. The engine.decide() function produces the outcome.
    """
    case_id: str                        # UUID — our internal tracking ID
    case_type: str                      # CaseType value: payment/subscription/mandate/checkout_drop_off/b2b_receivable
    payment_id: Optional[str]           # pay_xxx (Razorpay payment entity ID, None for pure dropoffs)
    order_id: str                       # order_xxx
    customer_id: str                    # cust_xxx
    sub_id: Optional[str] = None        # sub_xxx (subscription cases only)
    token_id: Optional[str] = None      # token_xxx (mandate/recurring only)
    amount_paise: int = 0               # Amount in paise (Razorpay convention)
    currency: str = "INR"               # INR
    method: str = "card"                # card/upi/netbanking/wallet/emandate
    card_network: Optional[str] = None  # visa/mastercard/rupay/amex/diners (if card)
    error_reason: str = "payment_failed"# The specific decline/abandonment reason
    error_code: str = "BAD_REQUEST_ERROR"# BAD_REQUEST_ERROR / GATEWAY_ERROR
    error_source: str = "gateway"       # customer/gateway/issuer_bank
    error_step: str = "payment_authorization"# payment_initiation/payment_authentication/payment_authorization
    error_description: str = "Payment failed."# Human-readable error message
    contact_phone: str = ""             # +91XXXXXXXXXX
    contact_email: str = ""             # customer email
    contact_name: str = ""              # Customer name (for voice scripts)
    created_at: str = ""                # ISO 8601 timestamp of the original failure
    history: List[dict] = field(default_factory=list)  # Historical past transactions

    # Checkout drop-off specific fields
    checkout_stage: Optional[str] = None       # cart_abandoned/address_submitted/payment_method_selected/otp_abandoned
    dropoff_reason: Optional[str] = None       # otp_not_received/unexpected_shipping_fees/etc.
    cart_items: Optional[List[dict]] = None    # Items in abandoned cart

    # B2B Receivables specific fields
    invoice_id: Optional[str] = None           # inv_xxx (Razorpay Invoice ID)
    company_name: Optional[str] = None         # Legal buyer entity name
    gstin: Optional[str] = None                # 15-char GSTIN
    po_number: Optional[str] = None            # PO-2026-XXXX
    invoice_date: Optional[str] = None         # ISO 8601
    due_date: Optional[str] = None             # ISO 8601
    aging_bucket: Optional[str] = None         # current/1_15_days/16_30_days/31_60_days/60_plus_days
    days_overdue: int = 0                      # Days past due_date
    dunning_tier: Optional[str] = None         # gentle_ap_reminder/formal_ap_notice/cfo_escalation/msmed_statutory_notice

    def to_dict(self) -> dict:
        return asdict(self)

    def to_jsonl(self) -> str:
        return json.dumps(self.to_dict(), default=str)


# ─── Decision (audit trail atom) ───────────────────────────────

@dataclass
class Decision:
    """
    Single decision made by the engine — the audit trail atom.

    Every action the engine takes produces one of these. Together,
    the sequence of Decisions for a case is the complete reasoning
    trace: what rule fired, why, what happened.

    Examples of rule_fired values:
      - "hard_decline_no_retry"
      - "soft_decline_retry_attempt_2_of_3"
      - "subscription_halt_at_3_retries"
      - "afa_required_amount_exceeds_15000"
      - "pre_debit_notification_24h"
      - "post_debit_confirmation_sent"
      - "customer_opted_out"
      - "out_of_band_settlement_detected"
      - "rpv_failed_after_2_retries"
      - "dispute_logged_for_manual_review"
    """
    decision_id: str                    # UUID
    case_id: str                        # FK to FailureInput.case_id
    timestamp: str                      # ISO 8601
    action: str                         # classify/retry/stop_retries/escalate_sms/
                                        # escalate_voice/recover/close/skip_escalation/
                                        # engine_error/pre_debit_notify/post_debit_confirm/
                                        # afa_check/opt_out/dispute
    rule_fired: str                     # Machine-readable rule identifier
    reason: str                         # Human-readable explanation
    details: Optional[dict] = None      # Structured context (retry_number, rng_draw, etc.)
    prev_hash: Optional[str] = None     # SHA-256 hash of preceding record in audit chain
    canonical_hash: Optional[str] = None # SHA-256 of canonical decision payload

    def to_dict(self) -> dict:
        return asdict(self)

    def to_jsonl(self) -> str:
        return json.dumps(self.to_dict(), default=str)


# ─── AgentResult (complete engine output for one failure) ──────

@dataclass
class AgentResult:
    """
    Complete result of running the decision engine on one FailureInput.

    Contains the original failure, every decision made, every event
    generated, and the final outcome. This is the unit of work that
    run_agent.py collects and aggregates.
    """
    failure: FailureInput               # The input that was processed
    decisions: List[Decision]           # Ordered sequence of decisions made
    events: List[Event]                 # Ordered sequence of events generated
    final_status: str                   # CaseStatus value
    recovery_method: str                # RecoveryMethod value
    recovered_amount_paise: int         # 0 if not recovered
    retry_count: int                    # Total retries attempted

    def to_dict(self) -> dict:
        return {
            "failure": self.failure.to_dict(),
            "decisions": [d.to_dict() for d in self.decisions],
            "events": [json.loads(e.to_jsonl()) for e in self.events],
            "final_status": self.final_status,
            "recovery_method": self.recovery_method,
            "recovered_amount_paise": self.recovered_amount_paise,
            "retry_count": self.retry_count,
        }

    def to_summary_dict(self) -> dict:
        """Compact summary for the results dashboard (no full event/decision lists)."""
        return {
            "case_id": self.failure.case_id,
            "case_type": self.failure.case_type,
            "amount_paise": self.failure.amount_paise,
            "error_reason": self.failure.error_reason,
            "method": self.failure.method,
            "final_status": self.final_status,
            "recovery_method": self.recovery_method,
            "recovered_amount_paise": self.recovered_amount_paise,
            "retry_count": self.retry_count,
            "decision_count": len(self.decisions),
            "event_count": len(self.events),
        }


# ─── Comparative Benchmark & Interventions Dataclasses ─────────

@dataclass
class PaymentLinkRecord:
    link_id: str
    short_url: str
    amount_paise: int
    case_id: str
    status: str
    created_at: str


@dataclass
class PolicyResult:
    policy_name: str
    case_id: str
    final_status: str
    recovered_amount_paise: int
    retry_count: int
    penalty_fees_paise: int
    compliance_violations: int
    payment_link: Optional[str] = None
    comm_cost_paise: int = 0
    interchange_cost_paise: int = 0
    decisions: List[Decision] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "policy_name": self.policy_name,
            "case_id": self.case_id,
            "final_status": self.final_status,
            "recovered_amount_paise": self.recovered_amount_paise,
            "retry_count": self.retry_count,
            "penalty_fees_paise": self.penalty_fees_paise,
            "compliance_violations": self.compliance_violations,
            "payment_link": self.payment_link,
            "comm_cost_paise": self.comm_cost_paise,
            "interchange_cost_paise": self.interchange_cost_paise,
            "decision_count": len(self.decisions),
            "event_count": len(self.events),
        }


@dataclass
class ComparativeBenchmark:
    run_id: str
    seed: int
    executed_at: str
    total_cases: int
    total_revenue_at_risk_paise: int
    control_recovered_paise: int
    treatment_recovered_paise: int
    control_penalty_fees_paise: int
    treatment_penalty_fees_paise: int
    control_violations: int
    treatment_violations: int
    control_net_recovery_paise: int
    treatment_net_recovery_paise: int
    net_recovery_lift_paise: int
    net_recovery_lift_pct: float
    testbed_links_created: int
    lift_ci_lower_paise: int = 0
    lift_ci_upper_paise: int = 0
    lift_p_value: float = 0.0
    is_statistically_significant: bool = True
    control_comm_costs_paise: int = 0
    treatment_comm_costs_paise: int = 0
    control_interchange_paise: int = 0
    treatment_interchange_paise: int = 0
    links: List[dict] = field(default_factory=list)
    policy_results: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)
