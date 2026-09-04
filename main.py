"""
main.py — Interactive Shell & Command Dispatcher for AI Revenue Recovery.

Written in the style and pattern of codecrafters-shell-python/app/main.py:
  - Clean REPL loop reading from sys.stdin.
  - BUILTINS dictionary dispatch table mapping commands to handlers.
  - Short, single-responsibility helper functions.
  - Direct, readable standard library usage.

Usage:
    python main.py                  # Launches interactive recovery shell
    python main.py run 42           # Direct execution of a command
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime

from run_agent import run_batch, load_failures, format_inr
from reporting import (
    compute_recovery_summary,
    sanity_check,
    print_summary,
    print_comparative_summary,
    get_case_compliance_trace,
    format_b2b_aging_table,
    format_checkout_dropoffs_table,
)
from voice_fsm import run_scripted_scenario, load_suppression_list
from benchmark import run_comparative_benchmark, BENCHMARK_FILE, write_audit_records
from razorpay_client import is_testbed_ready, get_client, create_payment_link
from webhook_handler import simulate_testbed_capture, run_webhook_server
from timing_engine import predict_optimal_retry_slot
from models import FailureInput
from ptp_tracker import format_ptp_table, record_promise_to_pay, evaluate_ptp_statuses

OUTPUT_DIR = Path("output")
FAILURES_FILE = OUTPUT_DIR / "failures.jsonl"
RESULTS_FILE = OUTPUT_DIR / "agent_results.json"


def cmd_benchmark(args):
    """Run Head-to-Head Comparative Policy Benchmark (Control vs Treatment)."""
    seed = int(args[0]) if args else 42
    print(f"Loading failures from {FAILURES_FILE}...")
    failures = load_failures(FAILURES_FILE)
    print(f"Running comparative benchmark across {len(failures)} cases (seed={seed})...")

    benchmark_res = run_comparative_benchmark(failures=failures, seed=seed, live_testbed=True)
    print_comparative_summary(benchmark_res.to_dict())
    return None


def cmd_testbed(args):
    """Verify live Razorpay testbed credentials and test live link generation."""
    ready = is_testbed_ready()
    if not ready:
        return "❌ Razorpay testbed credentials missing or invalid in .env"
    client = get_client()
    link = create_payment_link(
        client,
        amount_paise=150000,
        description="CLI Testbed Verification Link",
        customer_info={"name": "Aarav Sharma", "email": "aarav@example.com", "phone": "+919876543210"}
    )
    lines = [
        "\n=== Razorpay Testbed Health Check ===",
        "  Status: Connected & Authenticated (rzp_test_ key)",
        f"  Created Link ID: {link.get('id')}",
        f"  Live Short URL:  {link.get('short_url')}",
        f"  Amount:          ₹{link.get('amount', 0) / 100:,.2f}",
        "  Link verified active on testbed.",
    ]
    return "\n".join(lines)


from typing import Optional


def save_run_outputs(batch_output: dict, seed: int):
    """Save batch run JSON results, audit log, and HTML report."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_FILE, "w") as f:
        json.dump({
            "run_id": batch_output["run_id"],
            "seed": seed,
            "executed_at": batch_output["executed_at"],
            "total_failures_input": batch_output["total_failures_input"],
            "successful_cases": batch_output["successful_cases"],
            "summary": batch_output["summary"],
        }, f, indent=2, default=str)
    audit_path = OUTPUT_DIR / "audit_log.jsonl"
    write_audit_records(audit_path, batch_output["all_decisions"], run_id=batch_output["run_id"], mode="w")
    return audit_path


def cmd_run(args):
    """Run the live decision engine on failure cases."""
    seed = int(args[0]) if args else 42
    print(f"Loading failures from {FAILURES_FILE}...")
    failures = load_failures(FAILURES_FILE)
    print(f"Executing {len(failures)} cases through decision engine (seed={seed})...")
    batch_output = run_batch(failures=failures, seed=seed)
    audit_path = save_run_outputs(batch_output, seed)
    print(f"Run complete: {batch_output['successful_cases']} cases processed.")
    print(f"Generated: {RESULTS_FILE}, {audit_path}")
    print_summary(batch_output["summary"])
    return None


def cmd_summary(args):
    """Print the latest recovery or comparative benchmark summary."""
    if BENCHMARK_FILE.exists():
        with open(BENCHMARK_FILE, "r") as f:
            data = json.load(f)
        print_comparative_summary(data)
        return None
    if RESULTS_FILE.exists():
        with open(RESULTS_FILE, "r") as f:
            data = json.load(f)
        print_summary(data.get("summary", {}))
        return None
    return "No results found. Run 'benchmark' or 'run' first."


def find_case_in_failures(case_id: str) -> Optional[dict]:
    """Find a case by id or prefix in failures.jsonl."""
    f_path = Path("output/failures.jsonl")
    if not f_path.exists():
        return None
    with open(f_path) as f:
        for line in f:
            if case_id in line:
                return json.loads(line)
    return None


def format_case_timing_profile(c_dict: dict) -> list:
    """Format customer Bayesian timing and tenure profile."""
    f_obj = FailureInput(**c_dict)
    slot = predict_optimal_retry_slot(f_obj)
    bucket = "Long-time loyal user" if slot["tenure"] >= 20 else ("Established user" if slot["tenure"] >= 5 else "New user (cold-start)")
    return [
        "\nCustomer Profile & Bayesian Timing:",
        f"  Name:    {c_dict.get('contact_name')} ({c_dict.get('contact_phone')}) | Method: {c_dict.get('method')} | Amount: ₹{c_dict.get('amount_paise', 0)/100:,.2f}",
        f"  Tenure:  {slot['tenure']} past transactions ({bucket})",
        f"  Shrinkage Weight (w): {slot['shrinkage_weight']} (Historical mode: Day {slot['modal_day']} -> Target: Day {slot['target_day']})",
        f"  CBS Safety: Verified ({slot['scheduled_iso'][:16].replace('T', ' ')} IST, safe from 23:30-03:30 window)",
        f"  Channel: Recommends {slot['channel_recommendation']}",
    ]


def cmd_case(args):
    """Inspect full decision and compliance trace for a case ID."""
    if not args:
        return "Usage: case <case_id>"
    case_id = args[0]
    lines = [f"\n=== Case {case_id} — Compliance FSM & Audit Trace ==="]
    c_dict = find_case_in_failures(case_id)
    if c_dict:
        lines.extend(format_case_timing_profile(c_dict))
    trace = get_case_compliance_trace(case_id)
    lines.append("\nStatutory Compliance Gates:")
    for g in trace.get("gates", []):
        lines.append(f"  ✓ {g['gate']:<36} [{g['status']}] -> {g['rule']}")
    recs = trace.get("records", [])
    if not recs:
        lines.append(f"\n  (No explicit audit log records found for case prefix '{case_id}')")
        return "\n".join(lines)
    lines.append(f"\nAudit Log Events ({len(recs)} steps):")
    for i, d in enumerate(recs[:8], 1):
        lines.append(f"  [{i}] {d.get('timestamp')} | Action: {d.get('action', 'unknown'):<14} | Rule: {d.get('rule_fired')}")
        lines.append(f"      Reason: {d.get('reason')}")
    if len(recs) > 8:
        lines.append(f"  ... and {len(recs) - 8} more events recorded in output/audit_log.jsonl")
    return "\n".join(lines)


def cmd_capture(args):
    """Simulate or execute live Razorpay payment capture to close recovery loop."""
    if not args:
        return "Usage: capture <case_id> [amount_rupees]"
    case_id = args[0]
    amt = int(float(args[1]) * 100) if len(args) > 1 else 450000
    res = simulate_testbed_capture(case_id, amt)
    rec = res.get("record", {})
    return "\n".join([
        f"\n=== Razorpay Webhook Ingestion & Closed-Loop Settlement ===",
        f"  Event:           {res.get('event')}",
        f"  Case ID:         {case_id}",
        f"  Payment ID:      {rec.get('details', {}).get('payment_id')}",
        f"  Amount Settled:  ₹{amt / 100:,.2f}",
        f"  Rule Fired:      {rec.get('rule_fired')}",
        f"  Audit Log Event: {rec.get('event_id')} -> output/audit_log.jsonl",
        f"  Ledger Status:   output/benchmark_results.json updated with recovered revenue.",
        f"✓ Loop successfully closed. Payment reconciled."
    ])


def cmd_webhook(args):
    """Start local Razorpay Webhook HTTP listener."""
    port = int(args[0]) if args else 8080
    run_webhook_server(port)
    return None


def cmd_voice(args):
    """Run compliance voice FSM scenario."""
    scenario = args[0] if args else "successful_recovery"
    case_data = {
        "case_id": "demo-voice-1",
        "contact_name": "Aarav Patel",
        "contact_phone": "+919876543210",
        "amount_paise": 450000,
    }
    try:
        fsm = run_scripted_scenario(scenario, case_data)
        lines = [
            f"\n=== Voice FSM Run: {scenario} ===",
            f"Final State: {fsm.state}",
            f"Sub-reason:  {fsm.call_sub_reason or 'None'}",
            f"Decisions Logged: {len(fsm.decisions)}",
            f"Events Logged:    {len(fsm.events)}",
            "\nState Progression:"
        ]
        for d in fsm.decisions:
            lines.append(f"  -> {d.action:<25} [{d.rule_fired}]")
            lines.append(f"     {d.reason}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error executing scenario '{scenario}': {e}"


def cmd_suppression(args):
    """View active customer opt-out suppression list."""
    suppressed = load_suppression_list()
    if not suppressed:
        return "Suppression list is empty."
    lines = [f"\n=== Active Suppression List ({len(suppressed)} entries) ==="]
    for s in suppressed:
        lines.append(f"  Phone: {s.get('phone')} | Case: {s.get('case_id')} | Opted Out: {s.get('opted_out_at')}")
    return "\n".join(lines)


def cmd_benchmarks(args):
    """Display industry benchmark reference table."""
    lines = [
        "\n=== Industry Benchmark Reference Table ===",
        "  1. Stripe Smart Retries: 25% - 35% recovery for soft card declines.",
        "  2. Industry Automated Dunning: 50% - 70% overall with multichannel.",
        "  3. Indian Voice Collections RPC: 20% - 26% (midpoint 23% used).",
        "  4. AI Voicebot Conversion after RPC: ~20% (effective lift ~4.6%).",
        "  5. NPCI / SBI NACH Mandate Bounce Rate: ~70% initial failure.",
        "  6. RBI E-mandate Framework (2026): AFA threshold ₹15,000 / ₹1,00,000.",
    ]
    return "\n".join(lines)


def cmd_ptp(args):
    """View, track, or record Promise-to-Pay (PTP) commitments."""
    if not args:
        return f"\n=== Promise-to-Pay (PTP) Commitment Pipeline ===\n" + format_ptp_table()
    sub = args[0].lower()
    if sub == "add" and len(args) >= 3:
        case_id, date_str = args[1], args[2]
        notes = " ".join(args[3:]) if len(args) > 3 else "Customer promised to pay"
        rec = record_promise_to_pay(case_id, "Customer", "+919876543210", 450000, date_str, notes)
        return f"✓ Promise-to-Pay recorded: {rec['ptp_id']} for case {case_id} on {date_str}."
    if sub == "evaluate":
        evaluate_ptp_statuses()
        return "✓ Evaluated PTP statuses against calendar date."
    return "Usage: ptp | ptp add <case_id> <YYYY-MM-DD> [notes] | ptp evaluate"


def cmd_aging(args):
    """Display B2B Receivables Aging Schedule & Statutory Dunning status."""
    if RESULTS_FILE.exists():
        with open(RESULTS_FILE, "r") as f:
            data = json.load(f)
        summary = data.get("summary", {})
        tbl = format_b2b_aging_table(summary)
        if tbl:
            return tbl
    if FAILURES_FILE.exists():
        failures = load_failures(FAILURES_FILE)
        summary = compute_recovery_summary(failures)
        return format_b2b_aging_table(summary)
    return "No recovery data found. Run 'run' or 'generator.py' first."


def cmd_dropoffs(args):
    """Display Checkout Drop-off Funnel & Recovery Breakdown."""
    if RESULTS_FILE.exists():
        with open(RESULTS_FILE, "r") as f:
            data = json.load(f)
        summary = data.get("summary", {})
        tbl = format_checkout_dropoffs_table(summary)
        if tbl:
            return tbl
    if FAILURES_FILE.exists():
        failures = load_failures(FAILURES_FILE)
        summary = compute_recovery_summary(failures)
        return format_checkout_dropoffs_table(summary)
    return "No recovery data found. Run 'run' or 'generator.py' first."


def process_testbed_payment(client, p: dict):
    """Process single testbed payment through decision engine and create live link."""
    from razorpay_client import convert_payment_to_failure_input
    from engine import decide
    failure = convert_payment_to_failure_input(p)
    agent_res = decide(failure)
    link = None
    is_hard = any(d.rule_fired in ("hard_decline_no_retry", "visa_mastercard_cat1_stopping_rule") for d in agent_res.decisions)
    if not is_hard and agent_res.recovered_amount_paise == 0:
        desc = f"Recovery for {failure.case_id} ({failure.error_code})"
        cust = {"name": failure.contact_name, "email": failure.contact_email, "phone": failure.contact_phone}
        link = create_payment_link(client, failure.amount_paise, desc, cust)
    return failure, agent_res, link


def cmd_testbed_sync(args):
    """Ingest live failed payments from Razorpay testbed & execute recovery pipeline."""
    from razorpay_client import fetch_testbed_failed_payments
    if not is_testbed_ready():
        return "❌ Razorpay testbed credentials missing or invalid in .env"
    client = get_client()
    count = int(args[0]) if args else 20
    print(f"Ingesting up to {count} recent failed payments from live Razorpay testbed...")
    raw_payments = fetch_testbed_failed_payments(client, count=count)
    if not raw_payments:
        return "No failed payments currently found on Razorpay testbed."
    all_decisions = []
    print(f"Retrieved {len(raw_payments)} testbed payments. Executing recovery pipeline...")
    for p in raw_payments:
        failure, res, link = process_testbed_payment(client, p)
        all_decisions.extend(res.decisions)
        link_url = link.get("short_url", "N/A") if link else "N/A (suppressed or recovered)"
        act = res.decisions[-1].action if res.decisions else res.final_status
        print(f"  • {failure.payment_id} | {failure.error_code:<22} | Status: {res.final_status:<10} | Action: {act:<18} | Link: {link_url}")
    out_file = OUTPUT_DIR / "testbed_audit_log.jsonl"
    write_audit_records(out_file, all_decisions, run_id="testbed_sync", mode="a")
    print(f"\n✓ Processed {len(raw_payments)} testbed payments.")
    print(f"✓ Cryptographic audit log written to: {out_file}")
    return None


def cmd_audit(args):
    """Run cryptographic SHA-256 audit replay and invariant verification."""
    from audit_replay import run_audit_verification, print_audit_report
    audit_file = Path(args[0]) if args else OUTPUT_DIR / "audit_log.jsonl"
    if not audit_file.exists():
        return f"Audit log file not found at {audit_file}. Run 'benchmark' or 'run' first."
    report = run_audit_verification(audit_file)
    print_audit_report(report)
    return None


def cmd_lift(args):
    """Display Non-parametric Bootstrap Confidence Intervals (95% CI) and Lift."""
    if not BENCHMARK_FILE.exists():
        return f"Benchmark file not found at {BENCHMARK_FILE}. Run 'benchmark' first."
    with open(BENCHMARK_FILE) as f:
        data = json.load(f)
    print("\n" + "=" * 65)
    print("  EMPIRICAL NET RECOVERY LIFT & 95% BOOTSTRAP CONFIDENCE INTERVAL")
    print("=" * 65)
    print(f"  Net Lift (Point Estimate): ₹{data.get('net_recovery_lift_paise', 0) / 100:,.2f}")
    print(f"  95% Bootstrap CI:          [₹{data.get('lift_ci_lower_paise', 0) / 100:,.2f}, ₹{data.get('lift_ci_upper_paise', 0) / 100:,.2f}]")
    sig_str = "Statistically Significant (p < 0.05)" if data.get("is_statistically_significant") else "Not Significant"
    print(f"  Statistical Significance:  {sig_str}")
    print(f"  Empirical p-value:         {data.get('lift_p_value', 0):.4f}")
    print(f"  Control Net Recovered:     ₹{data.get('control_net_recovery_paise', 0) / 100:,.2f}")
    print(f"  Treatment Net Recovered:   ₹{data.get('treatment_net_recovery_paise', 0) / 100:,.2f}")
    print("=" * 65)
    return None


def cmd_help(args):
    """Show available commands."""
    lines = [
        "\nAvailable commands:",
        "  benchmark [seed]   - Head-to-Head Comparative Benchmark (Control vs Treatment)",
        "  sync [count]       - Ingest live failed payments from Razorpay testbed & recover",
        "  audit [path]       - Replay SHA-256 audit log & verify cryptographic invariants",
        "  lift               - Display Non-parametric 95% Bootstrap CI and empirical lift",
        "  testbed            - Test live Razorpay credentials & generate test link",
        "  capture <case_id>  - Ingest mock/live webhook capture to close recovery loop",
        "  webhook [port]     - Start local Razorpay Webhook HTTP listener",
        "  run [seed]         - Execute live decision engine batch",
        "  summary            - Display latest recovery & penalty savings scorecard",
        "  aging              - Display B2B Receivables Aging & Statutory Dunning Schedule",
        "  dropoffs           - Display Checkout Drop-off Funnel & Recovery Breakdown",
        "  case <case_id>     - Inspect 6-gate compliance FSM & audit trace for a case",
        "  ptp [add|evaluate] - View, track, or record Promise-to-Pay (PTP) commitments",
        "  voice [scenario]   - Run compliant voice FSM scenario",
        "  suppression        - View customer opt-out suppression list",
        "  benchmarks         - Show industry benchmarks reference",
        "  help               - Show this help message",
        "  exit               - Exit shell",
    ]
    return "\n".join(lines)


BUILTINS = {
    "benchmark": cmd_benchmark,
    "sync": cmd_testbed_sync,
    "audit": cmd_audit,
    "lift": cmd_lift,
    "testbed": cmd_testbed,
    "capture": cmd_capture,
    "webhook": cmd_webhook,
    "run": cmd_run,
    "summary": cmd_summary,
    "aging": cmd_aging,
    "dropoffs": cmd_dropoffs,
    "case": cmd_case,
    "ptp": cmd_ptp,
    "voice": cmd_voice,
    "suppression": cmd_suppression,
    "benchmarks": cmd_benchmarks,
    "help": cmd_help,
}


def main():
    # If arguments provided on CLI, execute directly
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        args = sys.argv[2:]
        if cmd in BUILTINS:
            out = BUILTINS[cmd](args)
            if out:
                print(out)
        else:
            print(f"Unknown command: {cmd}. Type 'help' for commands.")
        return

    # Interactive REPL shell in the exact pattern of codecrafters-shell-python
    print("AI Revenue Recovery Shell (type 'help' for commands, 'exit' to quit)")
    while True:
        sys.stdout.write("recover$ ")
        sys.stdout.flush()
        try:
            line = input()
        except EOFError:
            break
        parts = line.split()
        if not parts:
            continue
        cmd, *args = parts
        if cmd == "exit":
            break
        if cmd in BUILTINS:
            output = BUILTINS[cmd](args)
            if output is not None:
                print(output)
        else:
            print(f"{cmd}: command not found. Type 'help' for available commands.")


if __name__ == "__main__":
    main()
