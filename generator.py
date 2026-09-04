"""
generator.py — Synthetic failure input generator for AI Revenue Recovery.

Refactored in v2:
  - Generates raw FailureInput instances with NO baked-in outcomes or decisions.
  - Decision-making logic has been completely extracted into engine.py.
  - Generates output/failures.jsonl containing unbaked failure inputs.
  - generate_batch() runs engine.decide() on each failure to produce legacy
    (Case, Event) pairs for backward compatibility with existing tests/validators.

Usage:
    python generator.py
"""

import uuid
import random
import json
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Tuple, Optional

from models import (
    FailureInput, Decision, AgentResult, Case, Event,
    CaseType, DeclineClass, CaseStatus, RecoveryMethod, EventType,
)
from constants import (
    HARD_DECLINE_REASONS, SOFT_DECLINE_REASONS, TECHNICAL_DECLINE_REASONS,
    ERROR_REASON_DETAILS, DECLINE_REASON_SAMPLING,
    PAYMENT_METHOD_WEIGHTS, CARD_NETWORK_WEIGHTS,
    AMOUNT_TIERS_PAISE, CASE_TYPE_WEIGHTS, TARGET_CASE_COUNT,
    CHECKOUT_DROP_OFF_STAGE_WEIGHTS, CHECKOUT_DROP_OFF_REASONS_BY_STAGE,
    CHECKOUT_LOGNORMAL_MU, CHECKOUT_LOGNORMAL_SIGMA, CHECKOUT_MIN_PAISE, CHECKOUT_MAX_PAISE,
    B2B_AGING_WEIGHTS, B2B_DUNNING_TIERS, B2B_PAYMENT_TERMS,
    B2B_PARETO_SCALE_PAISE, B2B_PARETO_ALPHA, B2B_MAX_PAISE,
    GSTIN_STATE_CODES, B2B_COMPANY_NAMES, CHECKOUT_CATALOG,
)
from engine_config import default_payment_config, default_mandate_config
from engine import decide, classify_decline
from reporting import compute_recovery_summary, sanity_check, print_summary

# ─── Configuration ────────────────────────────────────────────
OUTPUT_DIR = Path("output")
SEED = 42  # Default reproducible seed

# Indian phone prefixes (realistic but synthetic)
PHONE_PREFIXES = ["9876", "9988", "8877", "7766", "9123", "8899", "9900", "7788"]
# Email domains
EMAIL_DOMAINS = ["gmail.com", "yahoo.co.in", "outlook.com", "rediffmail.com", "hotmail.com"]

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
    "Ayaan", "Krishna", "Ishaan", "Priya", "Ananya", "Diya", "Aditi",
    "Kiara", "Saanvi", "Aanya", "Aadhya", "Isha", "Nisha",
    "Rahul", "Amit", "Pradeep", "Suresh", "Rajesh", "Pooja", "Neha",
    "Shreya", "Kavita", "Meera", "Rohan", "Vikram", "Deepak", "Sanjay",
]
LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Nair",
    "Verma", "Joshi", "Mishra", "Iyer", "Pillai", "Das", "Banerjee",
    "Chauhan", "Yadav", "Thakur", "Mehta", "Shah", "Agarwal",
    "Mahanty", "Roy", "Dey", "Bose", "Mukherjee", "Ghosh",
]


def weighted_choice(weights: dict, rng: Optional[random.Random] = None) -> str:
    """Pick a key from a {key: weight} dict proportionally."""
    r = rng or random
    keys = list(weights.keys())
    vals = [weights[k] for k in keys]
    return r.choices(keys, weights=vals, k=1)[0]


BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

ARCHETYPES = {
    "tech_salaried": {"weight": 35, "days": [28, 29, 30, 31], "variance": 1},
    "govt_psu": {"weight": 20, "days": [1, 2], "variance": 0},
    "sme_code_on_wages": {"weight": 18, "days": [7, 8], "variance": 1},
    "contractor_epfo": {"weight": 12, "days": [14, 15, 16], "variance": 1},
    "gig_weekly": {"weight": 10, "days": [5, 12, 19, 26], "variance": 1},
    "msme_irregular": {"weight": 5, "days": [10, 20, 25], "variance": 4},
}


def gen_id(prefix: str, rng: Optional[random.Random] = None) -> str:
    """Generate authentic Razorpay Base62 ID like pay_TVV10J5uPIgztO (14 chars)."""
    r = rng or random
    suffix = "".join(r.choice(BASE62) for _ in range(14))
    return f"{prefix}_{suffix}"


def sample_customer_tenure(rng: Optional[random.Random] = None) -> int:
    """Sample customer tenure: 25% long (20-30), 45% medium (5-19), 30% new (1-4)."""
    r = rng or random
    bucket = r.choices(["new", "medium", "long"], weights=[30, 45, 25], k=1)[0]
    if bucket == "long":
        return r.randint(20, 30)
    if bucket == "medium":
        return r.randint(5, 19)
    return r.randint(1, 4)


def sample_archetype(rng: Optional[random.Random] = None) -> str:
    """Sample one of the 6 Indian financial statutory archetypes."""
    r = rng or random
    keys = list(ARCHETYPES.keys())
    weights = [ARCHETYPES[k]["weight"] for k in keys]
    return r.choices(keys, weights=weights, k=1)[0]


def compute_past_timestamp(base_dt: datetime, months_back: int, target_day: int, var_days: int, rng: random.Random) -> int:
    """Compute an authentic past UNIX timestamp in seconds."""
    delta_days = int(months_back * 30.4)
    approx_dt = base_dt - timedelta(days=delta_days)
    offset = rng.randint(-var_days, var_days)
    target = min(max(1, target_day + offset), 28)
    try:
        past_dt = approx_dt.replace(day=target, hour=rng.randint(9, 21), minute=rng.randint(0, 59))
    except ValueError:
        past_dt = approx_dt - timedelta(days=offset)
    return int(past_dt.timestamp())


def generate_single_past_payment(dt_unix: int, amount_paise: int, method: str, rng: random.Random) -> dict:
    """Generate a single past Razorpay payment entity matching testbed schema."""
    status = "captured" if rng.random() < 0.88 else "failed"
    amt_var = int(amount_paise * rng.choice([0.95, 1.0, 1.0, 1.0, 1.05]))
    return {
        "id": gen_id("pay", rng),
        "status": status,
        "amount": (amt_var // 100) * 100,
        "created_at": dt_unix,
        "method": method,
    }


def generate_customer_history(archetype: str, tenure: int, base_time: datetime, amount_paise: int, method: str, rng: random.Random) -> List[dict]:
    """Generate multi-tenure past transactions conforming to Razorpay schema."""
    cfg = ARCHETYPES.get(archetype, ARCHETYPES["tech_salaried"])
    history = []
    for m in range(1, tenure + 1):
        target_day = rng.choice(cfg["days"])
        dt_unix = compute_past_timestamp(base_time, m, target_day, cfg["variance"], rng)
        pay_method = method if rng.random() < 0.85 else rng.choice(["card", "upi", "netbanking"])
        history.append(generate_single_past_payment(dt_unix, amount_paise, pay_method, rng))
    history.sort(key=lambda x: x["created_at"])
    return history


def gen_phone(rng: Optional[random.Random] = None) -> str:
    r = rng or random
    prefix = r.choice(PHONE_PREFIXES)
    suffix = "".join([str(r.randint(0, 9)) for _ in range(6)])
    return f"+91{prefix}{suffix}"


def gen_email(name: str, rng: Optional[random.Random] = None) -> str:
    r = rng or random
    domain = r.choice(EMAIL_DOMAINS)
    slug = name.lower().replace(" ", ".") + str(r.randint(1, 999))
    return f"{slug}@{domain}"


def gen_name(rng: Optional[random.Random] = None) -> str:
    """Generate a realistic Indian name."""
    r = rng or random
    return f"{r.choice(FIRST_NAMES)} {r.choice(LAST_NAMES)}"


def gen_amount(rng: Optional[random.Random] = None) -> int:
    """Generate amount in paise from tiered distribution."""
    r = rng or random
    tier_weights = [t[2] for t in AMOUNT_TIERS_PAISE]
    tier = r.choices(AMOUNT_TIERS_PAISE, weights=tier_weights, k=1)[0]
    amount = r.randint(tier[0], tier[1])
    return (amount // 100) * 100


# ─── Raw Failure Input Generation (NO outcomes baked in) ────────

def build_payment_identifiers(case_type: str, r: random.Random) -> dict:
    """Generate authentic Razorpay entity IDs for a failure case."""
    sub_id = gen_id("sub", r) if case_type == CaseType.SUBSCRIPTION.value else None
    token_id = gen_id("token", r) if case_type in (CaseType.MANDATE.value, CaseType.SUBSCRIPTION.value) else None
    return {
        "payment_id": gen_id("pay", r),
        "order_id": gen_id("order", r),
        "customer_id": gen_id("cust", r),
        "sub_id": sub_id,
        "token_id": token_id,
    }


def sample_failure_attributes(r: random.Random) -> dict:
    """Sample payment method, card network, decline reason, and amount."""
    method = weighted_choice(PAYMENT_METHOD_WEIGHTS, r)
    card_net = weighted_choice(CARD_NETWORK_WEIGHTS, r) if method == "card" else None
    error_reason = weighted_choice(DECLINE_REASON_SAMPLING, r)
    details = ERROR_REASON_DETAILS.get(error_reason, {})
    return {
        "method": method, "card_network": card_net, "error_reason": error_reason,
        "error_code": details.get("error_code", "BAD_REQUEST_ERROR"),
        "error_source": details.get("error_source", "gateway"),
        "error_step": details.get("error_step", "payment_authorization"),
        "error_description": details.get("error_description", "Payment failed."),
        "amount": gen_amount(r),
    }


def sample_payment_hour(case_type: str, r: random.Random) -> int:
    """Sample realistic diurnal peak hours by case type."""
    if case_type in (CaseType.MANDATE.value, CaseType.SUBSCRIPTION.value):
        return r.choice([4, 5, 6, 7, 10, 11]) if r.random() < 0.80 else r.randint(8, 20)
    if case_type == CaseType.PAYMENT.value:
        return r.choice([12, 13, 14, 19, 20, 21, 22, 23]) if r.random() < 0.75 else r.randint(9, 18)
    return r.randint(10, 17)


def sample_cart_items(total_paise: int, rng: random.Random) -> List[dict]:
    """Sample authentic Indian D2C items totaling the basket amount."""
    k = 1 if total_paise < 150000 else (2 if total_paise < 500000 else rng.randint(2, 3))
    picks = rng.sample(CHECKOUT_CATALOG, k=k)
    items = []
    rem_paise = total_paise
    for idx, p in enumerate(picks):
        item_amt = int(total_paise / k) if idx < k - 1 else rem_paise
        rem_paise -= item_amt
        items.append({"sku": p["sku"], "name": p["name"], "category": p["category"], "qty": 1, "amount_paise": item_amt})
    return items


def generate_failure_input(
    case_type: str,
    base_time: datetime,
    rng: Optional[random.Random] = None,
) -> FailureInput:
    """Generate a single FailureInput with authentic multi-tenure history."""
    r = rng or random
    name = gen_name(r)
    ids = build_payment_identifiers(case_type, r)
    attrs = sample_failure_attributes(r)
    hour = sample_payment_hour(case_type, r)
    creation_dt = (base_time + timedelta(days=r.randint(0, 29))).replace(hour=hour, minute=r.randint(0, 59), second=r.randint(0, 59))
    history = generate_customer_history(sample_archetype(r), sample_customer_tenure(r), creation_dt, attrs["amount"], attrs["method"], r)
    return FailureInput(
        case_id=str(uuid.uuid4()), case_type=case_type, payment_id=ids["payment_id"],
        order_id=ids["order_id"], customer_id=ids["customer_id"], sub_id=ids["sub_id"],
        token_id=ids["token_id"], amount_paise=attrs["amount"], currency="INR",
        method=attrs["method"], card_network=attrs["card_network"], error_reason=attrs["error_reason"],
        error_code=attrs["error_code"], error_source=attrs["error_source"], error_step=attrs["error_step"],
        error_description=attrs["error_description"], contact_phone=gen_phone(r),
        contact_email=gen_email(name, r), contact_name=name, created_at=creation_dt.isoformat(),
        history=history,
    )


def gen_gstin(rng: random.Random) -> str:
    state = rng.choice(GSTIN_STATE_CODES)
    pan_chars = "".join(rng.choice("ABCDE") for _ in range(5))
    pan_nums = "".join(str(rng.randint(0, 9)) for _ in range(4))
    pan_check = rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    entity_code = str(rng.randint(1, 9))
    checksum = rng.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{state}{pan_chars}{pan_nums}{pan_check}{entity_code}Z{checksum}"


def gen_cart_amount(rng: random.Random) -> int:
    """Generate lognormally distributed cart amount in paise (median ~₹2,200)."""
    raw_rupees = rng.lognormvariate(CHECKOUT_LOGNORMAL_MU, CHECKOUT_LOGNORMAL_SIGMA)
    raw_paise = int(raw_rupees * 100)
    clamped = max(CHECKOUT_MIN_PAISE, min(CHECKOUT_MAX_PAISE, raw_paise))
    return (clamped // 100) * 100


def gen_b2b_amount(rng: random.Random) -> int:
    """Generate heavy-tailed Pareto invoice amount in paise (₹50k to ₹50L)."""
    val = rng.paretovariate(B2B_PARETO_ALPHA) * B2B_PARETO_SCALE_PAISE
    clamped = min(int(val), B2B_MAX_PAISE)
    return (clamped // 100000) * 100000


def generate_checkout_dropoff_input(base_time: datetime, rng: random.Random) -> FailureInput:
    stage = weighted_choice(CHECKOUT_DROP_OFF_STAGE_WEIGHTS, rng)
    drop_reason = rng.choice(CHECKOUT_DROP_OFF_REASONS_BY_STAGE.get(stage, ["cart_abandoned"]))
    name = gen_name(rng)
    h = rng.choice([13, 14, 15, 20, 21, 22, 23]) if rng.random() < 0.70 else rng.randint(9, 23)
    created_dt = (base_time + timedelta(days=rng.randint(0, 29))).replace(hour=h, minute=rng.randint(0, 59), second=rng.randint(0, 59))
    has_failed = stage in ("payment_method_selected", "otp_abandoned")
    amt_paise = gen_cart_amount(rng)
    items = sample_cart_items(amt_paise, rng)
    return FailureInput(
        case_id=str(uuid.uuid4()), case_type=CaseType.CHECKOUT_DROP_OFF.value,
        payment_id=gen_id("pay", rng) if has_failed else None, order_id=gen_id("order", rng),
        customer_id=gen_id("cust", rng), amount_paise=amt_paise, currency="INR",
        method=rng.choice(["upi", "card"]), card_network="visa" if rng.random() < 0.5 else "rupay",
        error_reason=drop_reason, error_code="CHECKOUT_DROP_OFF", error_source="customer",
        error_step="checkout_funnel", error_description=f"Abandoned at {stage}: {drop_reason}",
        contact_phone=gen_phone(rng), contact_email=gen_email(name, rng), contact_name=name,
        created_at=created_dt.isoformat(), history=[], checkout_stage=stage, dropoff_reason=drop_reason,
        cart_items=items,
    )


def generate_b2b_receivable_input(base_time: datetime, rng: random.Random) -> FailureInput:
    company = rng.choice(B2B_COMPANY_NAMES)
    bucket = weighted_choice(B2B_AGING_WEIGHTS, rng)
    overdue_days = 0 if bucket == "current" else (rng.randint(1, 15) if bucket == "1_15_days" else (rng.randint(16, 30) if bucket == "16_30_days" else (rng.randint(31, 60) if bucket == "31_60_days" else rng.randint(61, 90))))
    created_dt = (base_time + timedelta(days=rng.randint(0, 29))).replace(hour=rng.randint(10, 17), minute=rng.randint(0, 59), second=rng.randint(0, 59))
    due_dt = created_dt + timedelta(days=30)
    ap_name = gen_name(rng)
    return FailureInput(
        case_id=str(uuid.uuid4()), case_type=CaseType.B2B_RECEIVABLE.value,
        payment_id=None, order_id=gen_id("order", rng), customer_id=gen_id("cust", rng),
        amount_paise=gen_b2b_amount(rng), currency="INR", method="netbanking",
        error_reason=f"invoice_overdue_{bucket}", error_code="INVOICE_PAYMENT_OVERDUE",
        error_source="corporate_buyer", error_step="accounts_payable_settlement",
        error_description=f"Corporate invoice overdue by {overdue_days} days ({bucket}).",
        contact_phone=gen_phone(rng), contact_email=f"ap@{company.lower().split()[0]}.com",
        contact_name=f"{ap_name} (AP Lead, {company})", created_at=created_dt.isoformat(),
        history=[], invoice_id=gen_id("inv", rng), company_name=company, gstin=gen_gstin(rng),
        po_number=f"PO-2026-{rng.randint(1000, 9999)}", invoice_date=created_dt.strftime("%Y-%m-%d"),
        due_date=due_dt.strftime("%Y-%m-%d"), aging_bucket=bucket, days_overdue=overdue_days,
        dunning_tier=B2B_DUNNING_TIERS[bucket],
    )


def generate_failure_inputs(
    target_count: int = TARGET_CASE_COUNT,
    base_time: Optional[datetime] = None,
    seed: int = SEED,
) -> List[FailureInput]:
    """Generate a full batch of raw FailureInput objects."""
    rng = random.Random(seed)
    ist = timezone(timedelta(hours=5, minutes=30))
    if base_time is None:
        base_time = datetime.now(ist) - timedelta(days=30)

    failures: List[FailureInput] = []
    for case_type, weight in CASE_TYPE_WEIGHTS.items():
        count = int(target_count * weight)
        for _ in range(count):
            if case_type == CaseType.CHECKOUT_DROP_OFF.value:
                failures.append(generate_checkout_dropoff_input(base_time, rng))
            elif case_type == CaseType.B2B_RECEIVABLE.value:
                failures.append(generate_b2b_receivable_input(base_time, rng))
            else:
                failures.append(generate_failure_input(case_type, base_time, rng))

    failures.sort(key=lambda f: f.created_at)
    return failures


# ─── Legacy Adapter (Maps AgentResult to Case for CSV compatibility) ──

def extract_case_status_info(res: AgentResult) -> tuple:
    """Extract decline class and subscription status from result."""
    f = res.failure
    decline_class = next((d.details.get("decline_class") for d in res.decisions if d.action == "classify"), "soft")
    sub_status = None
    if f.case_type == CaseType.SUBSCRIPTION.value:
        sub_status = "active" if res.final_status == CaseStatus.RECOVERED.value else ("halted" if res.retry_count >= 3 else "pending")
    return decline_class, sub_status


def agent_result_to_case(res: AgentResult) -> Case:
    """Convert an AgentResult to a legacy Case object for CSV export."""
    f = res.failure
    decline_class, sub_status = extract_case_status_info(res)
    last_attempt = res.events[-1].event_timestamp if res.events else f.created_at
    return Case(
        f.case_id, f.case_type, f.payment_id or "", f.order_id, f.sub_id, f.token_id,
        f.customer_id, f.amount_paise, f.currency, f.method, f.card_network,
        f.error_code, f.error_source, f.error_step, f.error_reason, f.error_description,
        decline_class, sub_status, res.retry_count, 0 if decline_class == "hard" else 3,
        f.created_at, last_attempt, None, res.final_status, res.recovery_method,
        res.recovered_amount_paise, f.contact_phone, f.contact_email,
        f.invoice_id, f.company_name, f.gstin, f.aging_bucket, f.checkout_stage,
    )


def generate_batch(
    target_count: int = TARGET_CASE_COUNT,
    seed: int = SEED,
) -> Tuple[List[Case], List[Event]]:
    """
    Generate raw failures and execute them through the decision engine.
    Returns (cases, events) matching the legacy generator signature.
    """
    failures = generate_failure_inputs(target_count=target_count, seed=seed)
    rng = random.Random(seed)

    payment_config = default_payment_config()
    mandate_config = default_mandate_config()

    all_cases: List[Case] = []
    all_events: List[Event] = []

    for f in failures:
        cfg = mandate_config if f.case_type == CaseType.MANDATE.value else payment_config
        res = decide(f, cfg, rng)
        all_cases.append(agent_result_to_case(res))
        all_events.extend(res.events)

    all_events.sort(key=lambda e: e.event_timestamp)
    return all_cases, all_events


# ─── CLI Entrypoint ────────────────────────────────────────────

def write_cases_output(cases: list, events: list):
    """Write events, cases CSV, and cases JSONL to output directory."""
    with open(OUTPUT_DIR / "event_log.jsonl", "w") as f:
        for event in events:
            f.write(event.to_jsonl() + "\n")
    if cases:
        with open(OUTPUT_DIR / "cases.csv", "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(cases[0].to_csv_row().keys()))
            writer.writeheader()
            for c in cases:
                writer.writerow(c.to_csv_row())
    with open(OUTPUT_DIR / "cases.jsonl", "w") as f:
        for c in cases:
            f.write(json.dumps(c.to_dict(), default=str) + "\n")


def write_recovery_summary(cases: list):
    """Compute and save legacy recovery summary."""
    summary = compute_recovery_summary(cases)
    summary["sanity_flags"] = sanity_check(summary)
    with open(OUTPUT_DIR / "recovery_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print_summary(summary)


def main():
    print("=" * 60 + "\nAI Revenue Recovery — Failure Generator\n" + "=" * 60)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    failures = generate_failure_inputs(target_count=TARGET_CASE_COUNT, seed=SEED)
    with open(OUTPUT_DIR / "failures.jsonl", "w") as f:
        for fl in failures:
            f.write(fl.to_jsonl() + "\n")
    cases, events = generate_batch(target_count=TARGET_CASE_COUNT, seed=SEED)
    write_cases_output(cases, events)
    write_recovery_summary(cases)


if __name__ == "__main__":
    main()
