"""
timing_engine.py — Contextual Retry Timing & Bayesian Shrinkage Engine.

Adheres strictly to codecrafters-shell-python/app/main.py:
  - Flat, concise procedural functions (15-20 lines max, strict max 35 lines).
  - Zero bloated class hierarchies or OOP boilerplate.
  - Implements Empirical Bayes Shrinkage (w = N / (N + k0)) and Bank CBS safety.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from models import FailureInput

IST = timezone(timedelta(hours=5, minutes=30))
CBS_BLACKOUT_HOURS = {23, 0, 1, 2, 3}


def extract_historical_features(history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract temporal days, success counts, and method affinity from history."""
    if not history:
        return {"count": 0, "captured_count": 0, "modal_day": 1, "dominant_method": "card"}
    captured = [p for p in history if p.get("status") == "captured"]
    days = [datetime.fromtimestamp(p["created_at"], tz=IST).day for p in captured]
    modal_day = Counter(days).most_common(1)[0][0] if days else 1
    methods = [p.get("method", "card") for p in captured]
    dominant = Counter(methods).most_common(1)[0][0] if methods else "card"
    return {
        "count": len(history),
        "captured_count": len(captured),
        "modal_day": modal_day,
        "dominant_method": dominant,
    }


def compute_shrinkage_weight(n_events: int, k0: float = 5.0) -> float:
    """Compute empirical Bayes shrinkage weight w = N / (N + k0)."""
    return round(n_events / (n_events + k0), 4)


def is_cbs_blackout(dt: datetime) -> bool:
    """Check if timestamp falls into Bank Core Banking System blackout window."""
    if dt.hour in {0, 1, 2}:
        return True
    if dt.hour == 23 and dt.minute >= 30:
        return True
    if dt.hour == 3 and dt.minute <= 30:
        return True
    return False


def adjust_for_cbs_safety(dt: datetime) -> datetime:
    """Push timestamp forward if inside CBS maintenance window (23:30 - 03:30 IST)."""
    if is_cbs_blackout(dt):
        return dt.replace(hour=10, minute=30, second=0)
    return dt


def compute_target_day(modal_day: int, weight: float, prior_day: int = 1) -> int:
    """Blend prior macro payday with customer modal day via Bayesian weight."""
    target = round((1.0 - weight) * prior_day + weight * modal_day)
    return max(1, min(28, target))


def calculate_slot_delay(fail_dt: datetime, target_day: int, attempt: int) -> int:
    """Compute hours to wait until optimal safe retry slot for given attempt."""
    if attempt == 1:
        days_ahead = (target_day - fail_dt.day) % 28
        hours = (days_ahead * 24) + (10 - fail_dt.hour)
        return max(4, hours if hours > 0 else hours + (28 * 24))
    return 24 * attempt


def predict_optimal_retry_slot(failure: FailureInput, attempt: int = 1) -> Dict[str, Any]:
    """Predict optimal retry slot blending historical mode with cohort prior."""
    fail_dt = datetime.fromisoformat(failure.created_at)
    features = extract_historical_features(failure.history)
    w = compute_shrinkage_weight(features["count"], k0=5.0)
    target_day = compute_target_day(features["modal_day"], w, prior_day=1)
    delay_hours = calculate_slot_delay(fail_dt, target_day, attempt)
    scheduled = adjust_for_cbs_safety(fail_dt + timedelta(hours=delay_hours))
    needs_link = features["dominant_method"] == "upi" and failure.method == "card"
    return {
        "tenure": features["count"],
        "shrinkage_weight": w,
        "modal_day": features["modal_day"],
        "target_day": target_day,
        "delay_hours": delay_hours,
        "scheduled_iso": scheduled.isoformat(),
        "channel_recommendation": "whatsapp_payment_link" if needs_link else "auto_retry",
        "cbs_safe": not is_cbs_blackout(scheduled),
    }
