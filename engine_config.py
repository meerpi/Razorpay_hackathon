"""
engine_config.py — Configuration dataclasses for the decision engine.

Design: All tunable parameters are explicit in the config object, not
imported from constants.py at call time. This makes config-swap (payment
vs mandate) a data change, not a code change.

Factory functions build default configs from constants.py values.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from constants import (
    HARD_DECLINE_REASONS, SOFT_DECLINE_REASONS, TECHNICAL_DECLINE_REASONS,
    ERROR_REASON_DETAILS,
    RETRY_RULES, SUBSCRIPTION_HALTED_THRESHOLD,
    RECOVERY_RATES,
    RBI_CALLING_WINDOW_START_HOUR, RBI_CALLING_WINDOW_END_HOUR,
    EMANDATE_AFA_FREE_LIMIT_PAISE, EMANDATE_AFA_FREE_LIMIT_SPECIAL_PAISE,
    EMANDATE_PREDEBIT_NOTIFICATION_HOURS,
)


# ─── Config dataclasses ────────────────────────────────────────

@dataclass
class RetryPolicy:
    """Retry behavior for a specific decline class."""
    max_retries: int
    intervals_hours: List[int]
    success_probs_by_attempt: List[float]


@dataclass
class EngineConfig:
    """
    Complete configuration for the decision engine.

    Passed into engine.decide() — everything the engine needs to make
    decisions is in here, not in global state. This is what makes
    "fold Track 4 in as a config" possible.
    """
    name: str                                          # "payment_recovery" or "mandate_recovery"
    retry_policies: Dict[str, RetryPolicy]             # Keyed by DeclineClass value ("hard"/"soft"/"technical")
    subscription_halt_threshold: int                   # 3 retries (4 total attempts) before halting
    sms_email_recovery_rate: float                     # Probability of recovery via SMS/email dunning
    voice_rpc_rate: float                              # Right-Party Contact rate (NOT raw pickup)
    voice_conversion_rate: float                       # Conversion rate given RPC succeeded
    calling_window_start: int                          # Hour (24h format, IST)
    calling_window_end: int                            # Hour (24h format, IST)
    max_daily_call_attempts: int                       # Max voice attempts per day (prevent "excessive contact")

    # ─── Track 4: RBI e-mandate specific (None = not a mandate config) ───
    afa_threshold_paise: Optional[int] = None          # ₹15,000 general AFA-free limit
    afa_threshold_special_paise: Optional[int] = None  # ₹1,00,000 for insurance/MF/CC
    predebit_notification_hours: Optional[int] = None  # 24h pre-debit notification
    postdebit_confirmation_required: bool = False      # Post-debit confirmation (RBI 2026 framework)
    mandate_bounce_rate: Optional[float] = None        # ~70% NACH failure rate (SBI data)

    # ─── Decline classification sets (for engine.classify_decline) ───
    hard_decline_reasons: set = field(default_factory=set)
    soft_decline_reasons: set = field(default_factory=set)
    technical_decline_reasons: set = field(default_factory=set)
    error_reason_details: dict = field(default_factory=dict)


# ─── Factory functions ─────────────────────────────────────────

def default_payment_config() -> EngineConfig:
    """
    Default config for Tracks 1 & 3 (payment + subscription recovery).

    Sources for each parameter are documented in constants.py.
    voice_rpc_rate uses Right-Party Contact rate (20-26%, midpoint 23%)
    rather than raw pickup rate (48%), because the FSM requires RPV to
    pass before any payment discussion — crediting calls that would fail
    the compliance gate would overstate recovery.
    """
    return EngineConfig(
        name="payment_recovery",
        retry_policies={
            "hard": RetryPolicy(
                max_retries=RETRY_RULES["hard"]["max_retries"],
                intervals_hours=RETRY_RULES["hard"]["intervals_hours"],
                success_probs_by_attempt=[],
            ),
            "soft": RetryPolicy(
                max_retries=RETRY_RULES["soft"]["max_retries"],
                intervals_hours=RETRY_RULES["soft"]["intervals_hours"],
                success_probs_by_attempt=RECOVERY_RATES["auto_retry_by_attempt"]["soft"],
            ),
            "technical": RetryPolicy(
                max_retries=RETRY_RULES["technical"]["max_retries"],
                intervals_hours=RETRY_RULES["technical"]["intervals_hours"],
                success_probs_by_attempt=RECOVERY_RATES["auto_retry_by_attempt"]["technical"],
            ),
        },
        subscription_halt_threshold=SUBSCRIPTION_HALTED_THRESHOLD,
        sms_email_recovery_rate=RECOVERY_RATES["sms_email_recovery"],
        # Right-Party Contact rate, NOT raw pickup.
        # Source: iTuring debt recovery report — Indian collections RPC avg 20-26%
        # Using midpoint 23%. Raw pickup ~48% (Exotel) would overcount because
        # the FSM's RPV gate filters out non-borrower pickups before recovery.
        voice_rpc_rate=0.23,
        voice_conversion_rate=RECOVERY_RATES["voice_conversion_rate"],
        calling_window_start=RBI_CALLING_WINDOW_START_HOUR,
        calling_window_end=RBI_CALLING_WINDOW_END_HOUR,
        # RBI FPC: max 2-3 contact attempts per day to avoid "excessive contact"
        max_daily_call_attempts=2,
        # Classification sets
        hard_decline_reasons=set(HARD_DECLINE_REASONS),
        soft_decline_reasons=set(SOFT_DECLINE_REASONS),
        technical_decline_reasons=set(TECHNICAL_DECLINE_REASONS),
        error_reason_details=dict(ERROR_REASON_DETAILS),
    )


def default_mandate_config() -> EngineConfig:
    """
    Config for Track 4 (e-mandate / NACH recurring debit recovery).

    Extends the payment config with RBI e-mandate framework gates:
      - AFA threshold: ₹15,000 general, ₹1,00,000 insurance/MF/CC
      - Pre-debit notification: 24h before debit
      - Post-debit confirmation: after every successful debit
      - Mandate bounce rate: ~70% (SBI NACH data, The420/NPCI)

    Same retry policies as payment config — RBI does not specify a
    numeric retry cap for mandates (governed by bank/NPCI internal
    policies). The AFA/pre-debit/post-debit gates layer on top.
    """
    config = default_payment_config()
    config.name = "mandate_recovery"
    config.afa_threshold_paise = EMANDATE_AFA_FREE_LIMIT_PAISE
    config.afa_threshold_special_paise = EMANDATE_AFA_FREE_LIMIT_SPECIAL_PAISE
    config.predebit_notification_hours = EMANDATE_PREDEBIT_NOTIFICATION_HOURS
    config.postdebit_confirmation_required = True
    # Source: The420/NPCI — SBI NACH data shows ~70% mandate failure rate
    config.mandate_bounce_rate = 0.70
    return config
