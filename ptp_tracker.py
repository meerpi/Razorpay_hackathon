"""
ptp_tracker.py — Promise-to-Pay (PTP) Pipeline & Settlement Tracker.

Adheres strictly to codecrafters-shell-python/app/main.py:
  - Flat, concise procedural functions (<25 lines per function, max 35 lines).
  - Zero bloated class hierarchies or OOP boilerplate.
  - Tracks customer payment commitments: PENDING, KEPT, and BROKEN.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

IST = timezone(timedelta(hours=5, minutes=30))
PTP_FILE = Path("output/ptp_ledger.json")


def load_ptp_ledger() -> List[Dict[str, Any]]:
    """Load all Promise-to-Pay records from persistent ledger."""
    if not PTP_FILE.exists():
        return []
    try:
        with open(PTP_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_ptp_ledger(records: List[Dict[str, Any]]) -> None:
    """Save Promise-to-Pay records to persistent ledger."""
    PTP_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PTP_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def record_promise_to_pay(
    case_id: str,
    customer_name: str,
    phone: str,
    amount_paise: int,
    promised_date: str,
    notes: str = "",
) -> Dict[str, Any]:
    """Record a new customer commitment to pay by a specific date."""
    records = load_ptp_ledger()
    ptp_id = f"ptp_{case_id[:8]}_{len(records) + 1}"
    record = {
        "ptp_id": ptp_id,
        "case_id": case_id,
        "customer_name": customer_name,
        "phone": phone,
        "amount_paise": amount_paise,
        "promised_date": promised_date,
        "status": "PENDING",
        "created_at": datetime.now(IST).isoformat(),
        "notes": notes or "Customer promised to clear balance on scheduled date.",
    }
    records.append(record)
    save_ptp_ledger(records)
    return record


def update_ptp_status(case_id: str, new_status: str, notes: str = "") -> Optional[Dict[str, Any]]:
    """Update status of a PTP record (e.g. KEPT upon webhook capture, or BROKEN)."""
    records = load_ptp_ledger()
    updated = None
    for r in records:
        if r["case_id"] == case_id or r["ptp_id"] == case_id:
            r["status"] = new_status
            if notes:
                r["notes"] = notes
            updated = r
            break
    if updated:
        save_ptp_ledger(records)
    return updated


def evaluate_ptp_statuses(today_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Evaluate PTP records against current date to flag BROKEN commitments."""
    records = load_ptp_ledger()
    now_d = today_date or datetime.now(IST).strftime("%Y-%m-%d")
    changed = False
    for r in records:
        if r["status"] == "PENDING" and r["promised_date"] < now_d:
            r["status"] = "BROKEN"
            r["notes"] = f"Commitment expired on {r['promised_date']} without payment. Escalation triggered."
            changed = True
    if changed:
        save_ptp_ledger(records)
    return records


def compute_ptp_summary() -> Dict[str, Any]:
    """Compute aggregate conversion and slippage metrics for PTP commitments."""
    records = evaluate_ptp_statuses()
    total = len(records)
    kept = [r for r in records if r["status"] == "KEPT"]
    pending = [r for r in records if r["status"] == "PENDING"]
    broken = [r for r in records if r["status"] == "BROKEN"]
    return {
        "total_ptps": total,
        "kept_count": len(kept),
        "pending_count": len(pending),
        "broken_count": len(broken),
        "total_amount_paise": sum(r["amount_paise"] for r in records),
        "kept_amount_paise": sum(r["amount_paise"] for r in kept),
        "conversion_rate": round(len(kept) / total, 4) if total else 0.0,
    }


def format_ptp_table() -> str:
    """Format PTP pipeline table for CLI display."""
    records = evaluate_ptp_statuses()
    if not records:
        return "No Promise-to-Pay commitments recorded yet. Use 'ptp add' or run a voice recovery scenario."
    lines = [
        f"{'PTP ID':<14} | {'Customer':<20} | {'Amount':<10} | {'Promised':<10} | {'Status':<8} | Notes",
        "-" * 85,
    ]
    for r in records:
        amt = f"₹{r['amount_paise']/100:,.0f}"
        lines.append(f"{r['ptp_id']:<14} | {r['customer_name'][:20]:<20} | {amt:<10} | {r['promised_date']:<10} | {r['status']:<8} | {r['notes'][:22]}")
    summary = compute_ptp_summary()
    lines.append("-" * 85)
    lines.append(f"Total: {summary['total_ptps']} | Kept: {summary['kept_count']} | Pending: {summary['pending_count']} | Broken: {summary['broken_count']} | Conversion: {summary['conversion_rate']:.0%}")
    return "\n".join(lines)
