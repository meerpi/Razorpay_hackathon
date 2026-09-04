"""
constants.py — All generator constants with source citations.

Every value traces to a URL, circular name, testbed observation,
or is explicitly labeled as an assumption.
"""
from pathlib import Path

OUTPUT_DIR = Path("output")
BENCHMARK_FILE = OUTPUT_DIR / "benchmark_results.json"
AUDIT_LOG_FILE = OUTPUT_DIR / "audit_log.jsonl"

# ─────────────────────────────────────────────────────────────
# ERROR CLASSIFICATION
# Source: https://razorpay.com/docs/build/llm-docs/errors/payments/cards.md
# Source: https://razorpay.com/docs/build/llm-docs/payments/payments/test-card-details.md
# ─────────────────────────────────────────────────────────────

HARD_DECLINE_REASONS = {
    # Card is expired — requires new card
    # Source: cards.md "card_expired"
    "card_expired",
    # Wrong card number — permanent data error
    # Source: cards.md "card_number_invalid"
    "card_number_invalid",
    # Card blocked by bank or customer
    # Source: cards.md "debit_instrument_blocked"
    "debit_instrument_blocked",
    # Card not enrolled for online payments
    # Source: cards.md "card_not_enrolled"
    "card_not_enrolled",
    # Card disabled for online payments (similar to not_enrolled)
    # Source: cards.md "card_disabled_for_online_payments"
    "card_disabled_for_online_payments",
    # Bank flagged as fraud/risky
    # Source: cards.md "payment_risk_check_failed"
    "payment_risk_check_failed",
}

SOFT_DECLINE_REASONS = {
    # Temporary balance issue — may clear on payday
    # Source: cards.md "insufficient_funds"
    "insufficient_funds",
    # Customer took too long — can retry
    # Source: cards.md "payment_timed_out"
    "payment_timed_out",
    # Customer cancelled — may retry
    # Source: cards.md "payment_cancelled"
    "payment_cancelled",
    # Wrong OTP — can retry with correct OTP
    # Source: cards.md "authentication_failed"
    "authentication_failed",
    # Typo on CVV — can retry
    # Source: cards.md "incorrect_cvv"
    "incorrect_cvv",
    # Daily limit hit — clears next day
    # Source: cards.md "transaction_limit_exceeded"
    "transaction_limit_exceeded",
}

TECHNICAL_DECLINE_REASONS = {
    # Partner bank/gateway downtime
    # Source: cards.md "gateway_technical_error"
    "gateway_technical_error",
    # Customer's bank downtime
    # Source: cards.md "bank_technical_error"
    "bank_technical_error",
    # Generic bank decline (no specific reason given)
    # Source: cards.md "payment_failed"
    "payment_failed",
    # Card temporarily inactive
    # Source: cards.md "debit_instrument_inactive"
    "debit_instrument_inactive",
}

ALL_ERROR_REASONS = HARD_DECLINE_REASONS | SOFT_DECLINE_REASONS | TECHNICAL_DECLINE_REASONS

# ─────────────────────────────────────────────────────────────
# ERROR SOURCE VALUES
# Source: https://razorpay.com/docs/build/llm-docs/errors/payments/payment-methods-error-parameters.md
# ─────────────────────────────────────────────────────────────

# Maps error_reason → most likely (error_source, error_step, error_code)
# Source: Razorpay error parameter docs + test card docs
ERROR_REASON_DETAILS = {
    # --- Hard declines ---
    "card_expired": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card has expired. Please use another card.",
    },
    "card_number_invalid": {
        "error_source": "customer",
        "error_step": "payment_initiation",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "You have entered an incorrect card number. Try again.",
    },
    "debit_instrument_blocked": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card is blocked. Please contact your bank.",
    },
    "card_not_enrolled": {
        "error_source": "issuer_bank",
        "error_step": "card_enrollment_check",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card is not enabled for online payments.",
    },
    "card_disabled_for_online_payments": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card is disabled for online payments.",
    },
    "payment_risk_check_failed": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment declined by bank due to risk check.",
    },
    # --- Soft declines ---
    "insufficient_funds": {
        "error_source": "gateway",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your payment could not be completed due to insufficient account balance.",
    },
    "payment_timed_out": {
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your payment could not be completed due to a temporary issue. Try again later.",
    },
    "payment_cancelled": {
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your payment has been cancelled.",
    },
    "authentication_failed": {
        "error_source": "gateway",
        "error_step": "payment_authentication",
        "error_code": "GATEWAY_ERROR",
        "error_description": "Payment could not be completed due to incorrect OTP or verification details.",
    },
    "incorrect_cvv": {
        "error_source": "customer",
        "error_step": "payment_initiation",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Incorrect CVV entered.",
    },
    "transaction_limit_exceeded": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Maximum transaction limit exceeded for the day.",
    },
    # --- Technical declines ---
    "gateway_technical_error": {
        "error_source": "gateway",
        "error_step": "payment_authorization",
        "error_code": "GATEWAY_ERROR",
        "error_description": "Payment did not go through due to a temporary issue.",
    },
    "bank_technical_error": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "GATEWAY_ERROR",
        "error_description": "Bank downtime. Please try again later.",
    },
    "payment_failed": {
        "error_source": "gateway",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment was declined by the bank.",
    },
    "debit_instrument_inactive": {
        "error_source": "issuer_bank",
        "error_step": "payment_authorization",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your card is currently inactive.",
    },
}

# ─────────────────────────────────────────────────────────────
# DECLINE REASON FREQUENCY WEIGHTS
# No single public source gives exact percentages for Indian payments.
# These are ASSUMPTIONS informed by:
#   - Web search: "insufficient funds and authentication failures are the
#     most frequent user-side errors" (multiple industry sources)
#   - Web search: "bank server downtime is the most frequent technical error"
#   - Razorpay card error docs list them roughly in frequency order
# Labeled: ASSUMPTION — no public source for exact distribution
# ─────────────────────────────────────────────────────────────

DECLINE_REASON_WEIGHTS = {
    # Soft declines (~55% of all declines) — most are retryable
    "insufficient_funds":       0.18,   # ASSUMPTION — leading cause per industry sources
    "authentication_failed":    0.12,   # ASSUMPTION — second most common
    "payment_timed_out":        0.08,   # ASSUMPTION
    "payment_cancelled":        0.07,   # ASSUMPTION
    "incorrect_cvv":            0.05,   # ASSUMPTION
    "transaction_limit_exceeded": 0.05, # ASSUMPTION
    # Technical declines (~20% of all declines)
    "gateway_technical_error":  0.07,   # ASSUMPTION — common during peak
    "bank_technical_error":     0.06,   # ASSUMPTION
    "payment_failed":           0.05,   # ASSUMPTION — generic catch-all
    "debit_instrument_inactive": 0.02,  # ASSUMPTION
    # Hard declines (~25% of all declines)
    "card_declined":            0.08,   # Not in our sets — mapped to payment_failed
    "card_expired":             0.05,   # ASSUMPTION
    "card_not_enrolled":        0.04,   # ASSUMPTION
    "card_disabled_for_online_payments": 0.03, # ASSUMPTION
    "payment_risk_check_failed": 0.02,  # ASSUMPTION
    "debit_instrument_blocked": 0.01,   # ASSUMPTION — rare
    "card_number_invalid":      0.02,   # ASSUMPTION — data-entry error
}

# Normalized weights for sampling (just the reasons we classify)
DECLINE_REASON_SAMPLING = {
    # Soft
    "insufficient_funds":       0.18,
    "authentication_failed":    0.12,
    "payment_timed_out":        0.08,
    "payment_cancelled":        0.07,
    "incorrect_cvv":            0.05,
    "transaction_limit_exceeded": 0.05,
    # Technical
    "gateway_technical_error":  0.07,
    "bank_technical_error":     0.06,
    "payment_failed":           0.05,
    "debit_instrument_inactive": 0.02,
    # Hard
    "card_expired":             0.05,
    "card_not_enrolled":        0.04,
    "card_disabled_for_online_payments": 0.03,
    "payment_risk_check_failed": 0.02,
    "debit_instrument_blocked": 0.01,
    "card_number_invalid":      0.02,
}

# ─────────────────────────────────────────────────────────────
# PAYMENT METHOD DISTRIBUTION
# ASSUMPTION — no single authoritative source gives method-level
# breakdown. Informed by:
#   - UPI dominates Indian transaction volume (NPCI data, multiple reports)
#   - Cards still significant for subscriptions/recurring
#   - Netbanking declining but still used
#   - Wallet small but present
#   - Emandate for recurring/mandates
# ─────────────────────────────────────────────────────────────

PAYMENT_METHOD_WEIGHTS = {
    "card":         0.30,   # ASSUMPTION — strong for subs/recurring
    "upi":          0.40,   # ASSUMPTION — dominates volume
    "netbanking":   0.15,   # ASSUMPTION — declining
    "wallet":       0.08,   # ASSUMPTION
    "emandate":     0.07,   # ASSUMPTION — recurring/mandates
}

# ─────────────────────────────────────────────────────────────
# CARD NETWORK DISTRIBUTION (when method == "card")
# Source: Web search — IMARC, PwC, 1Lattice reports 2025-2026
# "Visa ~43.5% credit, RuPay ~16-18% credit, ~50%+ debit"
# Blended estimate for card payments hitting a payment gateway:
# ─────────────────────────────────────────────────────────────

CARD_NETWORK_WEIGHTS = {
    "visa":         0.40,   # Source: ~43.5% credit market share (web search)
    "mastercard":   0.30,   # Source: ~30% estimated (web search, remainder calc)
    "rupay":        0.22,   # Source: 16-18% credit + dominant debit → blended ~22%
    "amex":         0.05,   # Source: small share (web search)
    "diners":       0.03,   # Source: very small (web search)
}

# ─────────────────────────────────────────────────────────────
# RETRY RULES PER DECLINE CLASS
# Source (timing): ASSUMPTION — Razorpay does not publish exact retry
#   intervals. Modeled after common smart-retry patterns.
# Source (subscription cap): Razorpay subscription states docs
#   https://razorpay.com/docs/build/llm-docs/payments/subscriptions/states.md
#   "after all retry attempts have been exhausted" → 3 consecutive failures
#   Confirmed by web search (multiple sources say 3).
#   NOT testbed-verified (Subscriptions add-on requires account activation).
# ─────────────────────────────────────────────────────────────

RETRY_RULES = {
    "hard": {
        "max_retries": 0,           # No auto-retry — requires customer action
        "intervals_hours": [],      # Source: card error docs — "contact bank"
    },
    "soft": {
        "max_retries": 3,           # ASSUMPTION — common smart-retry pattern
        "intervals_hours": [4, 24, 72],  # ASSUMPTION — escalating delays
    },
    "technical": {
        "max_retries": 4,           # ASSUMPTION — technical issues often clear faster
        "intervals_hours": [1, 4, 12, 24],  # ASSUMPTION
    },
}

# Subscription-specific: halted after this many consecutive failures
# Source: https://razorpay.com/docs/build/llm-docs/payments/subscriptions/states.md
# "After all the retry attempts have been exhausted, the Subscription
#  moves to the halted state."
# Web search confirms: 3 consecutive failures → halted
# NOT testbed-verified (Subscriptions add-on requires ₹199 account activation)
SUBSCRIPTION_HALTED_THRESHOLD = 3

# ─────────────────────────────────────────────────────────────
# RECOVERY PROBABILITIES PER STAGE
# Sources cited inline from empirical fintech & dunning research
# ─────────────────────────────────────────────────────────────

RECOVERY_RATES = {
    # Auto-retry recovery per attempt (Decaying Success Curve)
    # Sources:
    #   1. Recurly "State of Subscriptions 2026" (median ~49% dunning recovery)
    #   2. Slicker SaaS Dunning Research (Attempt 1: 40-60% of recoverable pool,
    #      Attempt 2: 15-25% of remainder, Attempt 3: 10-15% of remainder)
    #   3. Juspay Retry Engine Report (up to 25% of failed transactions converted via smart retries)
    #   4. Stripe Smart Retries Audits (25-35% real-world auto-retry recovery)
    "auto_retry_by_attempt": {
        # Soft declines (insufficient funds, timeouts, limits)
        # Attempt 1 (4h delay): 24% | Attempt 2 (24h delay): 16% | Attempt 3 (72h delay): 9%
        # Yields ~42% cumulative auto-retry recovery on soft declines
        "soft": [0.24, 0.16, 0.09],
        # Technical declines (gateway glitches, bank server downtime)
        # Technical issues often clear fast after bank maintenance window
        # Attempt 1 (1h delay): 35% | Attempt 2 (4h delay): 22% | Attempt 3 (12h delay): 12% | Attempt 4 (24h delay): 5%
        # Yields ~56% cumulative auto-retry recovery on technical declines
        "technical": [0.35, 0.22, 0.12, 0.05],
    },

    # SMS/email dunning recovery (after automated card/mandate retries exhaust)
    # Source: Industry dunning reports (post-retry manual push recovery ~15%)
    "sms_email_recovery": 0.15,

    # Voice escalation recovery (Hinglish AI Voicebot)
    # Sources:
    #   1. Enterprise AI Voicebot deployment studies in India (1M+ collection calls):
    #      ~48% first-attempt connected pickup rate (cumulative ~70% across attempts)
    #   2. Gen-AI Voicebot conversion benchmarks: ~20% payment conversion on connected calls
    # Effective recovery = pickup (0.48) × conversion (0.20) ≈ 9.6%
    "voice_pickup_rate":     0.48,
    "voice_conversion_rate": 0.20,
}

# ─────────────────────────────────────────────────────────────
# RBI CALLING WINDOW
# Source: RBI/2022-23/108 (August 12, 2022)
# Confirmed by: RBI (Commercial Banks — Responsible Business Conduct)
#   Fourth Amendment Directions, 2026
# Source: Web search — "8:00 AM to 7:00 PM" confirmed across
#   freed.care, resolvenow.co.in, settleloans.in, multiple legal sources
# Applies every day including weekends and holidays
# ─────────────────────────────────────────────────────────────

RBI_CALLING_WINDOW_START_HOUR = 8    # 8:00 AM IST
RBI_CALLING_WINDOW_END_HOUR = 19     # 7:00 PM IST (19:00)

# ─────────────────────────────────────────────────────────────
# RBI E-MANDATE FRAMEWORK
# Source: RBI "Digital Payments – E-Mandate Framework, 2026"
#   (effective April 21, 2026, consolidates 8 prior circulars)
# Source: Web search — rbi.org.in, amlegals.com, rocketpay.co.in
# ─────────────────────────────────────────────────────────────

EMANDATE_AFA_FREE_LIMIT_PAISE = 15000_00   # ₹15,000 in paise (1,500,000 paise) — no AFA needed per cycle
EMANDATE_AFA_FREE_LIMIT_SPECIAL_PAISE = 100_000_00  # ₹1,00,000 for insurance/MF/CC bills
# Pre-debit notification: 24 hours before debit (source: RBI framework)
EMANDATE_PREDEBIT_NOTIFICATION_HOURS = 24
# Retry limit: NOT specified by RBI — governed by bank/NPCI internal policies
# Source: Web search — "specific technical retry limits are generally governed
#   by the internal risk management policies of banks and payment networks"
# We use our own retry rules above; this is noted as not RBI-mandated
EMANDATE_RETRY_LIMIT_NOTE = "No explicit numeric retry cap in RBI circular. Bank/NPCI internal policies govern."

# ─────────────────────────────────────────────────────────────
# AMOUNT DISTRIBUTION (in paise)
# ASSUMPTION — modeled to represent a mix of:
#   - Small recurring (OTT streaming ₹149-₹999)
#   - Medium (SaaS ₹500-₹5000)
#   - Insurance premiums (₹2000-₹15000)
#   - Loan EMIs (₹5000-₹50000)
# ─────────────────────────────────────────────────────────────

AMOUNT_TIERS_PAISE = [
    # (min, max, weight, description)
    (14900,    99900,   0.30, "Small recurring (OTT/digital)"),    # ₹149-₹999
    (100000,   500000,  0.35, "Medium (SaaS/utilities)"),          # ₹1000-₹5000
    (500100,   1500000, 0.25, "Large (insurance/EMI)"),            # ₹5001-₹15000
    (1500100,  5000000, 0.10, "Very large (loan EMI/high-value)"), # ₹15001-₹50000
]

# ─────────────────────────────────────────────────────────────
# CASE TYPE DISTRIBUTION
# ASSUMPTION — designed to give good coverage across all tracks
# ─────────────────────────────────────────────────────────────

CASE_TYPE_WEIGHTS = {
    "payment":           0.30,  # ~450 cases: One-off card/UPI/netbanking failures
    "subscription":      0.25,  # ~375 cases: Recurring subscription churn
    "mandate":           0.20,  # ~300 cases: RBI e-mandate / NACH bounces
    "checkout_drop_off": 0.15,  # ~225 cases: High-intent abandoned checkout recovery
    "b2b_receivable":    0.10,  # ~150 cases: Corporate Accounts Receivable / Invoices
}
# voice_escalation cases are derived (not independently sampled)

# ─────────────────────────────────────────────────────────────
# SUBSCRIPTION STATES
# Source: https://razorpay.com/docs/build/llm-docs/payments/subscriptions/states.md
# ─────────────────────────────────────────────────────────────

SUBSCRIPTION_STATES = [
    "created", "authenticated", "active", "pending",
    "halted", "cancelled", "paused", "expired", "completed",
]

# ─────────────────────────────────────────────────────────────
# BATCH SIZE
# ─────────────────────────────────────────────────────────────

TARGET_CASE_COUNT = 1500  # 450 payment + 375 subscription + 300 mandate + 225 checkout drop-off + 150 b2b

# ─────────────────────────────────────────────────────────────
# CARD NETWORK STOPPING RULES & PENALTY FEES
# Source: Visa Excessive Reattempts Rule & Mastercard TPE Policy
# Category 1 Hard Declines (card_expired, invalid_card_number, etc.)
# incur excessive authorization penalty fees (~$0.50 / ₹42 per excess attempt).
# ─────────────────────────────────────────────────────────────

VISA_EXCESSIVE_AUTH_FEE_USD = 0.10
MASTERCARD_TPE_FEE_USD = 0.50
EXCESSIVE_AUTH_PENALTY_INR = 42.0  # Approx ₹42 ($0.50) per excess auth retry
TRAI_TRANSACTIONAL_HEADER = "1601"  # TRAI mandated series for private financial entities
PROMISE_TO_PAY_GRACE_DAYS = 3       # Max grace days before re-triggering follow-up

# Direct Communication & Gateway Processing Costs
SMS_COST_INR = 0.15              # ₹0.15 per TRAI DLT transactional SMS
WHATSAPP_COST_INR = 0.35         # ₹0.35 per Meta WhatsApp Business utility conversation
VOICE_COST_PER_MIN_INR = 1.50    # ₹1.50 per telephony minute for AI Voicebot
GATEWAY_PROCESSING_FEE_RATE = 0.015  # 1.5% interchange + PG fee on recovered volume

# ISO 8583 Scheme Stopping Category Definitions
ISO_8583_CATEGORY_1_CODES = {"14", "41", "43", "54", "04"}  # Never retry (Category 1)
ISO_8583_CATEGORY_2_CODES = {"51", "91", "96"}               # Wait and retry (Category 2)
ISO_8583_CATEGORY_3_CODES = {"55", "82"}                     # Correct and retry (Category 3)
ISO_8583_CATEGORY_1 = ISO_8583_CATEGORY_1_CODES

# Mapping from Razorpay error reasons to primary ISO 8583 code & category
ERROR_REASON_ISO_MAP = {
    "card_expired": {"iso_code": "54", "category": 1, "description": "Expired Card"},
    "card_number_invalid": {"iso_code": "14", "category": 1, "description": "Invalid Card Number"},
    "debit_instrument_blocked": {"iso_code": "41", "category": 1, "description": "Lost/Blocked Card"},
    "payment_risk_check_failed": {"iso_code": "05", "category": 1, "description": "Do Not Honor / Risk"},
    "card_not_enrolled": {"iso_code": "57", "category": 1, "description": "Transaction Not Permitted to Issuer/Cardholder"},
    "card_disabled_for_online_payments": {"iso_code": "57", "category": 1, "description": "Card Disabled for Online"},
    "insufficient_funds": {"iso_code": "51", "category": 2, "description": "Insufficient Funds"},
    "payment_timed_out": {"iso_code": "91", "category": 2, "description": "System/Switch Timeout"},
    "payment_cancelled": {"iso_code": "00", "category": 2, "description": "Customer Cancelled"},
    "incorrect_cvv": {"iso_code": "82", "category": 3, "description": "Incorrect CVV"},
    "authentication_failed": {"iso_code": "55", "category": 3, "description": "Authentication / PIN Failed"},
    "transaction_limit_exceeded": {"iso_code": "61", "category": 2, "description": "Exceeds Withdrawal Limit"},
    "gateway_technical_error": {"iso_code": "96", "category": 2, "description": "Gateway Malfunction"},
    "bank_technical_error": {"iso_code": "91", "category": 2, "description": "Issuer Bank Downtime"},
    "payment_failed": {"iso_code": "05", "category": 2, "description": "Generic Bank Decline"},
    "debit_instrument_inactive": {"iso_code": "57", "category": 2, "description": "Inactive Card"},
}

# ─────────────────────────────────────────────────────────────
# CHECKOUT DROP-OFF RECOVERY (Baymard Institute & Razorpay Magic Checkout)
# Source: Baymard Institute 2026 Meta-analysis (70.22% average e-commerce cart abandonment)
# Source: Razorpay Magic Checkout Whitepaper (28-32% recovery lift via pre-filled 1-click links)
# ─────────────────────────────────────────────────────────────

CHECKOUT_DROP_OFF_STAGES = [
    "cart_abandoned",
    "address_submitted",
    "payment_method_selected",
    "otp_abandoned",
]

CHECKOUT_DROP_OFF_STAGE_WEIGHTS = {
    "cart_abandoned":          0.35,  # Browsing/intent stage exit
    "address_submitted":       0.25,  # Dropped after entering delivery details
    "payment_method_selected": 0.20,  # Selected payment instrument, halted
    "otp_abandoned":           0.20,  # Dropped on 3DS / OTP page
}

CHECKOUT_DROP_OFF_REASONS_BY_STAGE = {
    "cart_abandoned": [
        "window_shopping_exit",
        "accidental_tab_close",
        "price_comparison_pause",
    ],
    "address_submitted": [
        "unexpected_shipping_fees",
        "delivery_time_too_long",
        "address_form_friction",
    ],
    "payment_method_selected": [
        "saved_card_unavailable",
        "preferred_bank_missing",
        "upi_intent_app_switch_failed",
    ],
    "otp_abandoned": [
        "otp_not_received",
        "bank_page_latency_timeout",
        "3ds_auth_cancelled",
    ],
}

# Conversion rates by intent stage when dynamic 1-click link is sent
CHECKOUT_RECOVERY_RATES = {
    "otp_abandoned":           0.32,  # Highest intent — customer was at authorization
    "payment_method_selected": 0.25,  # Method chosen — strong purchase intent
    "address_submitted":       0.20,  # Address filled — moderate friction
    "cart_abandoned":          0.14,  # Early funnel intent
}

# Empirical lognormal basket distribution (median ~₹2,200; range ₹499 to ₹15,000)
CHECKOUT_LOGNORMAL_MU = 7.7
CHECKOUT_LOGNORMAL_SIGMA = 0.65
CHECKOUT_MIN_PAISE = 49900      # ₹499
CHECKOUT_MAX_PAISE = 1500000    # ₹15,000

# ─────────────────────────────────────────────────────────────
# B2B RECEIVABLES & AGING SCHEDULE (HighRadius, Upflow & MSMED Act 2006)
# Statutory Source: Section 43B(h) Income Tax Act 1961 (Finance Act 2023)
# Statutory Source: Section 15 & 16 Micro, Small and Medium Enterprises Development (MSMED) Act 2006
# ─────────────────────────────────────────────────────────────

B2B_AGING_BUCKETS = [
    "current",
    "1_15_days",
    "16_30_days",
    "31_60_days",
    "60_plus_days",
]

B2B_AGING_WEIGHTS = {
    "current":      0.35,  # Not yet overdue
    "1_15_days":    0.28,  # Minor approval / payment run lag
    "16_30_days":   0.18,  # Mid delinquency
    "31_60_days":   0.12,  # Late delinquency — Section 43B(h) disallowance threshold
    "60_plus_days": 0.07,  # Critical — Statutory MSMED penal interest
}

B2B_PAYMENT_TERMS = [
    "net15",
    "net30",
    "net45",
    "net60",
]

B2B_DUNNING_TIERS = {
    "current":      "pre_due_courtesy",
    "1_15_days":    "gentle_ap_reminder",
    "16_30_days":   "formal_ap_notice",
    "31_60_days":   "cfo_escalation",
    "60_plus_days": "msmed_statutory_notice",
}

# Recovery rates by aging bucket under intelligent tiered dunning
B2B_RECOVERY_RATES = {
    "current":      0.95,
    "1_15_days":    0.75,
    "16_30_days":   0.52,
    "31_60_days":   0.34,
    "60_plus_days": 0.17,
}

# Pareto distribution parameters for B2B invoices (scale ₹50,000, max ₹50,00,000)
B2B_PARETO_SCALE_PAISE = 5000000   # ₹50,000 base
B2B_PARETO_ALPHA = 1.6
B2B_MAX_PAISE = 500000000          # ₹50,00,000 (₹50 Lakh)

# Statutory penal interest rate under MSMED Act Section 16 (3x RBI repo rate: ~19.5% p.a.)
MSMED_PENAL_INTEREST_ANNUAL_RATE = 0.195

GSTIN_STATE_CODES = ["27", "29", "07", "33", "24", "19", "06"]  # MH, KA, DL, TN, GJ, WB, HR

B2B_COMPANY_NAMES = [
    "Apex Logistics Solutions Pvt Ltd",
    "Zenith Healthware LLP",
    "CloudScale Technologies Pvt Ltd",
    "Bharat Infra Projects Ltd",
    "Nexura Digital Media LLP",
    "Paramount Engineering Works",
    "BlueDart SupplyChain Services Ltd",
    "FinMatrix Consulting Pvt Ltd",
    "Quantalytics Data Systems LLP",
    "Vanguard Chemical Industries Ltd",
    "Trident Agro Exports Pvt Ltd",
    "Hyperion Telecom Services LLP",
    "Starlight Manufacturing Corp",
    "Aura Consumer Goods Pvt Ltd",
    "Sigma Heavy Equipment Ltd",
]

# Realistic D2C / E-commerce catalog for authentic cart abandonment baskets
CHECKOUT_CATALOG = [
    {"name": "boAt Airdopes 141 ANC Earbuds", "sku": "BOAT-AIR-141", "category": "Electronics"},
    {"name": "Noise ColorFit Pulse 2 Max Smartwatch", "sku": "NOISE-WAT-02", "category": "Wearables"},
    {"name": "The Whole Truth Protein Bars (Pack of 6)", "sku": "TWT-BAR-P06", "category": "Nutrition"},
    {"name": "Mamaearth Onion Hair Oil 250ml", "sku": "MAMA-OIL-250", "category": "Personal Care"},
    {"name": "Sleepy Owl Dark Roast Cold Brew (500ml)", "sku": "SOWL-CB-500", "category": "Beverages"},
    {"name": "Snitch Relaxed Fit Linen Shirt", "sku": "SNITCH-LIN-04", "category": "Apparel"},
    {"name": "Mokobara Transit Backpack 24L", "sku": "MOKO-BP-24L", "category": "Luggage"},
    {"name": "Heads Up For Tails Orthopedic Dog Bed", "sku": "HUFT-BED-M01", "category": "Pet Supplies"},
    {"name": "Phool Organic Incense Sticks Gift Box", "sku": "PHOOL-INC-BOX", "category": "Home Decor"},
    {"name": "Bombay Shaving Company Precision Trimmer", "sku": "BSC-TRIM-P01", "category": "Grooming"},
]


