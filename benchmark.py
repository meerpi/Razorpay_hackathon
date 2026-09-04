"""
benchmark.py — Head-to-Head Comparative Policy Runner for AI Revenue Recovery.

Adheres strictly to codecrafters-shell-python/app/main.py:
  - Flat, concise procedural functions (15-25 lines max).
  - Zero bloated class hierarchies or OOP boilerplate.
  - Non-parametric Bootstrap Confidence Intervals & SHA-256 audit hash chaining.
"""

import os
import json
import random
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from models import FailureInput, ComparativeBenchmark, PaymentLinkRecord
from policies import evaluate_control_case, evaluate_treatment_case
from engine_config import default_payment_config
from razorpay_client import get_client

OUTPUT_DIR = Path("output")
BENCHMARK_FILE = OUTPUT_DIR / "benchmark_results.json"
AUDIT_LOG_FILE = OUTPUT_DIR / "audit_log.jsonl"


def run_single_comparison(failure: FailureInput, config, rng_c, rng_t, rzp_client, live_link=False):
    res_control = evaluate_control_case(failure, config, rng_c)
    res_treatment = evaluate_treatment_case(failure, config, rng_t, rzp_client, live_link=live_link)
    return res_control, res_treatment


def hash_audit_entry(d: dict, prev_hash: str) -> Tuple[dict, str]:
    payload = {
        "prev_hash": prev_hash,
        "case_id": d.get("case_id"),
        "timestamp": d.get("timestamp"),
        "action": d.get("action"),
        "rule_fired": d.get("rule_fired"),
        "reason": d.get("reason"),
    }
    canon = json.dumps(payload, sort_keys=True)
    entry_hash = hashlib.sha256(canon.encode("utf-8")).hexdigest()
    d["prev_hash"] = prev_hash
    d["canonical_hash"] = entry_hash
    return d, entry_hash


def get_last_audit_hash(path: Path) -> str:
    if not path.exists():
        return "0" * 64
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            if f.tell() == 0:
                return "0" * 64
            f.seek(max(0, f.tell() - 4096))
            lines = f.read().decode("utf-8", errors="ignore").strip().splitlines()
            if lines:
                return json.loads(lines[-1]).get("canonical_hash") or "0" * 64
    except Exception:
        pass
    return "0" * 64


def write_audit_records(audit_file_path, decisions=None, run_id: str = "run_default", mode: str = "a"):
    if isinstance(audit_file_path, list):
        decisions, audit_file_path = audit_file_path, decisions
    path = Path(audit_file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    prev_hash = "0" * 64 if mode == "w" else get_last_audit_hash(path)
    with open(path, mode) as f:
        for dec in (decisions or []):
            d = dec.to_dict() if hasattr(dec, "to_dict") else dict(dec)
            d["run_id"] = run_id
            chained_dict, prev_hash = hash_audit_entry(d, prev_hash)
            f.write(json.dumps(chained_dict, default=str) + "\n")


def sum_metrics(comparisons: list):
    c_rec = sum(c[1].recovered_amount_paise for c in comparisons)
    t_rec = sum(c[2].recovered_amount_paise for c in comparisons)
    c_pen = sum(c[1].penalty_fees_paise for c in comparisons)
    t_pen = sum(c[2].penalty_fees_paise for c in comparisons)
    c_viol = sum(c[1].compliance_violations for c in comparisons)
    t_viol = sum(c[2].compliance_violations for c in comparisons)
    c_comm = sum(c[1].comm_cost_paise for c in comparisons)
    t_comm = sum(c[2].comm_cost_paise for c in comparisons)
    c_inter = sum(c[1].interchange_cost_paise for c in comparisons)
    t_inter = sum(c[2].interchange_cost_paise for c in comparisons)
    return (c_rec, t_rec, c_pen, t_pen, c_viol, t_viol, c_comm, t_comm, c_inter, t_inter)


def compute_case_net(c_item) -> Tuple[int, int]:
    ctrl_net = max(0, c_item[1].recovered_amount_paise - c_item[1].penalty_fees_paise - c_item[1].interchange_cost_paise - c_item[1].comm_cost_paise)
    trt_net = max(0, c_item[2].recovered_amount_paise - c_item[2].penalty_fees_paise - c_item[2].interchange_cost_paise - c_item[2].comm_cost_paise)
    return ctrl_net, trt_net


def compute_bootstrap_lift_ci(comparisons: list, n_boot: int = 1000, seed: int = 42) -> Tuple[int, int, float, bool]:
    if not comparisons:
        return 0, 0, 1.0, False
    rng = random.Random(seed)
    n = len(comparisons)
    case_nets = [compute_case_net(c) for c in comparisons]
    lifts = []
    for _ in range(n_boot):
        sample = [case_nets[rng.randint(0, n - 1)] for _ in range(n)]
        boot_lift = sum(s[1] - s[0] for s in sample)
        lifts.append(boot_lift)
    lifts.sort()
    lower = lifts[int(0.025 * n_boot)]
    upper = lifts[int(0.975 * n_boot)]
    p_val = round(sum(1 for l in lifts if l <= 0) / n_boot, 4)
    return lower, upper, p_val, (lower > 0)


def aggregate_benchmark_metrics(run_id: str, seed: int, comparisons: list, links: list) -> ComparativeBenchmark:
    m = sum_metrics(comparisons)
    c_rec, t_rec, c_pen, t_pen, c_viol, t_viol, c_comm, t_comm, c_inter, t_inter = m
    c_net = max(0, c_rec - c_pen - c_inter - c_comm)
    t_net = max(0, t_rec - t_pen - t_inter - t_comm)
    lift = t_net - c_net
    lift_pct = round((lift / c_net * 100) if c_net > 0 else 0.0, 2)
    ci_low, ci_high, p_val, is_sig = compute_bootstrap_lift_ci(comparisons, n_boot=1000, seed=seed)
    return ComparativeBenchmark(
        run_id, seed, datetime.now().isoformat(), len(comparisons),
        sum(c[0].amount_paise for c in comparisons), c_rec, t_rec,
        c_pen, t_pen, c_viol, t_viol, c_net, t_net, lift, lift_pct,
        len(links), ci_low, ci_high, p_val, is_sig,
        c_comm, t_comm, c_inter, t_inter,
        [l.__dict__ for l in links]
    )


def process_benchmark_case(idx: int, f: FailureInput, cfg, rng_c, rng_t, rzp_client, sample_count: int):
    create_live = bool(rzp_client and idx < sample_count)
    c_res, t_res = run_single_comparison(f, cfg, rng_c, rng_t, rzp_client, live_link=create_live)
    c_res.failure, t_res.failure = f, f
    link = None
    if t_res.payment_link:
        link = PaymentLinkRecord(f"plink_{f.case_id[:8]}", t_res.payment_link, f.amount_paise, f.case_id, "active", datetime.now().isoformat())
    return (f, c_res, t_res), c_res.decisions + t_res.decisions, link


def run_comparative_benchmark(failures: List[FailureInput], seed: int = 42, live_testbed: bool = True, sample_links_count: int = 5) -> ComparativeBenchmark:
    rng_c, rng_t = random.Random(seed), random.Random(seed)
    cfg, rzp = default_payment_config(), (get_client() if live_testbed else None)
    run_id = f"bm_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{seed}"
    comparisons, links, all_decisions = [], [], []

    for idx, f in enumerate(failures):
        comp, decs, link = process_benchmark_case(idx, f, cfg, rng_c, rng_t, rzp, sample_links_count)
        comparisons.append(comp)
        all_decisions.extend(decs)
        if link:
            links.append(link)

    write_audit_records(AUDIT_LOG_FILE, all_decisions, run_id, mode="w")
    res = aggregate_benchmark_metrics(run_id, seed, comparisons, links)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(BENCHMARK_FILE, "w") as f:
        json.dump(res.to_dict(), f, indent=2, default=str)
    return res
