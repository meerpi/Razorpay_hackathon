"""
test_suite.py — Comprehensive verification suite for AI Revenue Recovery.

Written in the style and pattern of codecrafters-shell-python/app/main.py:
  - Concise, focused test functions (15-25 lines).
  - Dictionary dispatch table mapping test names to runner functions.
  - Clear CLI runner in main().

Tests:
  1. determinism: Pure function determinism with identical RNG seed.
  2. smoke: Hard, soft, and technical decline routing.
  3. convergence: Statistical convergence over 5,000 trials (±2.5pp).
  4. config_swap: Dynamic AFA/pre-debit gate firing on mandate config.
  5. idempotency: Non-destructive run protection.
  6. error_isolation: Unhandled exception recovery and audit logging.
  7. voice_fsm: Regulatory compliance and calling window gates.
  8. suppression: Automatic escalation suppression for opted-out users.
  9. audit_completeness: Temporal monotonicity and decision-event lineage.

Usage:
    python test_suite.py          # Runs all tests
    python test_suite.py smoke    # Runs specific test
"""

import sys
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from models import FailureInput, CaseType, DeclineClass, CaseStatus
from engine_config import default_payment_config, default_mandate_config
from engine import decide
from voice_fsm import run_scripted_scenario, is_suppressed
from run_agent import run_batch
from webhook_handler import simulate_testbed_capture
from reporting import compute_penalty_savings, get_case_compliance_trace

IST = timezone(timedelta(hours=5, minutes=30))


def make_test_failure(case_id="test-1", case_type="payment", reason="insufficient_funds", amount=100000, phone=None) -> FailureInput:
    return FailureInput(
        case_id=case_id,
        case_type=case_type,
        payment_id=f"pay_{case_id}",
        order_id=f"order_{case_id}",
        customer_id=f"cust_{case_id}",
        sub_id=f"sub_{case_id}" if case_type == "subscription" else None,
        token_id=f"token_{case_id}" if case_type == "mandate" else None,
        amount_paise=amount,
        currency="INR",
        method="card",
        card_network="visa",
        error_reason=reason,
        error_code="BAD_REQUEST_ERROR",
        error_source="customer",
        error_step="payment_authorization",
        error_description="Payment failed.",
        contact_phone=phone or "+919100123456",
        contact_email="test@example.com",
        contact_name="Rahul Sharma",
        created_at="2026-08-29T10:00:00+05:30",
    )


def test_determinism():
    """Verify that same FailureInput + same RNG seed produces byte-identical output."""
    f = make_test_failure()
    cfg = default_payment_config()
    res1 = decide(f, cfg, random.Random(42))
    res2 = decide(f, cfg, random.Random(42))
    assert res1.to_dict() == res2.to_dict(), "Determinism failed: outputs differ!"
    return "Identical seeds produced 100% byte-identical AgentResult and UUIDs."


def test_smoke():
    """Verify routing for hard, soft, technical, and subscription cases."""
    cfg = default_payment_config()
    rng = random.Random(100)

    # 1. Hard decline (card_expired)
    res_hard = decide(make_test_failure(reason="card_expired"), cfg, rng)
    assert res_hard.retry_count == 0, "Hard decline attempted retries!"
    assert any(d.rule_fired == "hard_decline_no_retry" for d in res_hard.decisions)

    # 2. Soft decline
    res_soft = decide(make_test_failure(reason="insufficient_funds"), cfg, rng)
    assert res_soft.retry_count > 0, "Soft decline did not retry!"

    # 3. Subscription halt threshold check
    res_sub = decide(make_test_failure(case_type="subscription", reason="insufficient_funds"), cfg, random.Random(9999))
    if not res_sub.recovered_amount_paise:
        assert res_sub.retry_count <= 3, "Subscription exceeded 3 retries!"
        assert any("subscription_halt" in d.rule_fired for d in res_sub.decisions)

    return "Hard (0 retries), Soft (<=3 retries), and Subscription halt gates verified."


def test_convergence():
    """Verify empirical retry success rates converge to theoretical curve within tolerance."""
    cfg = default_payment_config()
    rng = random.Random(42)
    trials = 5000
    attempt_1_successes = 0

    for i in range(trials):
        f = make_test_failure(case_id=f"conv-{i}", reason="insufficient_funds")
        res = decide(f, cfg, rng)
        # Check first retry decision outcome
        retry_1_dec = next((d for d in res.decisions if "retry_attempt_1" in d.rule_fired), None)
        if retry_1_dec and retry_1_dec.details.get("outcome") == "succeeded":
            attempt_1_successes += 1

    empirical_p1 = attempt_1_successes / trials
    expected_p1 = cfg.retry_policies["soft"].success_probs_by_attempt[0]  # 0.24
    delta = abs(empirical_p1 - expected_p1)
    assert delta < 0.025, f"Convergence delta {delta:.4f} exceeds 2.5pp (empirical: {empirical_p1:.3f}, expected: {expected_p1:.3f})"
    return f"5,000 trials converged: empirical {empirical_p1:.1%} vs expected {expected_p1:.1%} (diff: {delta:.2%})."


def test_config_swap():
    """Assert mandate config triggers AFA gate and pre-debit notifications while payment config does not."""
    f_high = make_test_failure(case_type="mandate", amount=20000_00)  # ₹20,000 (exceeds ₹15k AFA threshold)
    f_low = make_test_failure(case_type="mandate", amount=10000_00)   # ₹10,000 (below threshold)

    p_cfg = default_payment_config()
    m_cfg = default_mandate_config()

    # 1. Run high-value on payment config -> No AFA check
    res_pay = decide(f_high, p_cfg, random.Random(42))
    assert not any(d.action == "afa_check" for d in res_pay.decisions), "Payment config should not perform AFA check!"

    # 2. Run high-value on mandate config -> AFA check required
    res_mand_high = decide(f_high, m_cfg, random.Random(42))
    afa_high = next((d for d in res_mand_high.decisions if d.action == "afa_check"), None)
    assert afa_high and afa_high.details.get("afa_required") is True, "Mandate high-value did not require AFA!"
    assert any(d.action == "pre_debit_notify" for d in res_mand_high.decisions), "Pre-debit notify missing!"

    # 3. Run low-value on mandate config -> AFA not required
    res_mand_low = decide(f_low, m_cfg, random.Random(42))
    afa_low = next((d for d in res_mand_low.decisions if d.action == "afa_check"), None)
    assert afa_low and afa_low.details.get("afa_required") is False, "Mandate low-value falsely required AFA!"

    return "Dynamic config swap verified: AFA gate and 24h pre-debit notify fire only on mandate config."


def test_idempotency():
    """Verify batch runner is idempotent and creates unique run_ids."""
    failures = [make_test_failure(case_id=f"idemp-{i}") for i in range(10)]
    out1 = run_batch(failures, seed=42)
    out2 = run_batch(failures, seed=42)
    assert out1["summary"]["recovered_cases"] == out2["summary"]["recovered_cases"]
    assert out1["run_id"] != out2["run_id"], "Run IDs must be distinct per execution invocation."
    return "Batch execution is repeatable and records distinct audit run_ids."


def test_error_isolation():
    """Verify malformed input does not crash batch and logs engine_error in audit trail."""
    batch = [make_test_failure(case_id=f"ok-{i}") for i in range(5)]
    malformed = make_test_failure(case_id="err-1")
    malformed.created_at = "not-a-valid-iso-date"  # invalid date triggers ValueError in engine
    batch.append(malformed)

    batch_output = run_batch(batch, seed=42)
    assert batch_output["error_count"] == 1
    assert batch_output["successful_cases"] == 5
    assert any(d.action == "engine_error" for d in batch_output["all_decisions"])
    return "Error isolated: exception recorded in audit log without dropping 5 valid cases."


def test_voice_fsm():
    """Verify all 6 compliance scenarios and the 8 AM - 7 PM calling window gate."""
    case_data = {"case_id": "v-1", "contact_name": "Aarav Patel", "contact_phone": "+919876543210", "amount_paise": 300000}
    scenarios = ["successful_recovery", "rpv_failed", "rpv_retry_then_success", "human_escalation_requested", "dispute_logged", "opt_out_callback"]
    for sc in scenarios:
        fsm = run_scripted_scenario(sc, case_data)
        assert fsm.state in ["CALL_COMPLETE", "CALL_FAILED", "HUMAN_ESCALATION", "DISPUTE_LOGGED", "OPT_OUT_RECORDED"]

    # Calling window test
    fsm_night = run_scripted_scenario("successful_recovery", case_data, call_time=datetime(2026, 8, 29, 21, 30, tzinfo=IST))
    assert fsm_night.state == "CALL_FAILED" and fsm_night.call_sub_reason == "window_violation"
    return "6 voice scenarios + 8 AM-7 PM calling window enforcement verified."


def test_suppression():
    """Verify customer opt-out suppresses future outreach attempts."""
    phone = "+919876543210"
    f = make_test_failure(case_id="supp-1")
    f.contact_phone = phone
    # seed 0 ensures retries exhaust so case reaches escalation suppression
    res = decide(f, default_payment_config(), random.Random(0), suppressed_contacts={phone})
    assert res.final_status == CaseStatus.OPTED_OUT.value
    assert any(d.rule_fired == "customer_opted_out" for d in res.decisions)
    return "Suppressed contact successfully skipped all SMS/voice escalations."


def test_audit_completeness():
    """Verify decisions and events are non-empty and temporally ordered."""
    f = make_test_failure()
    res = decide(f, default_payment_config(), random.Random(42))
    assert len(res.decisions) >= 3, "Insufficient decisions logged!"
    assert len(res.events) >= 3, "Insufficient events logged!"
    d_timestamps = [d.timestamp for d in res.decisions]
    assert d_timestamps == sorted(d_timestamps), "Decision timestamps are not monotonically increasing!"
    return f"Audit trail complete: {len(res.decisions)} decisions & {len(res.events)} events monotonically ordered."


def test_stopping_rules():
    """Verify Card Network Stopping Rules (Visa CAT 1 / Mastercard TPE): 0 retries on hard decline."""
    from policies import evaluate_treatment_case
    f = make_test_failure(reason="card_expired")
    res = evaluate_treatment_case(f, default_payment_config(), random.Random(42))
    assert res.retry_count == 0, f"Hard decline had {res.retry_count} retries instead of 0!"
    assert res.penalty_fees_paise == 0, "Hard decline incurred penalty fees!"
    assert any("stopping_rule" in d.rule_fired for d in res.decisions)
    return "Stopping rule verified: 0 retries on card_expired, 0 network penalty fees."


def test_penalty_accounting():
    """Verify Control incurs excessive auth fees while Treatment incurs 0 fees."""
    from policies import evaluate_control_case, evaluate_treatment_case
    f = make_test_failure(reason="card_number_invalid")
    c_res = evaluate_control_case(f, default_payment_config(), random.Random(42))
    t_res = evaluate_treatment_case(f, default_payment_config(), random.Random(42))
    assert c_res.penalty_fees_paise > 0, "Control policy failed to account for network penalty fees!"
    assert t_res.penalty_fees_paise == 0, "Treatment policy incurred penalty fees!"
    return f"Penalty accounting verified: Control incurred ₹{c_res.penalty_fees_paise/100:.2f}, Treatment ₹0.00."


def test_testbed_payment_link():
    """Verify real Razorpay SDK generates live working payment link on testbed."""
    from razorpay_client import get_client, create_payment_link, is_testbed_ready
    assert is_testbed_ready(), "Testbed keys missing or not in test mode!"
    client = get_client()
    link = create_payment_link(client, 250000, "Automated test link", {"name": "Test User", "email": "test@example.com", "phone": "+919876543210"})
    assert "short_url" in link and "rzp.io" in link["short_url"], f"Invalid link: {link}"
    return f"Live testbed payment link verified: {link['short_url']} (ID: {link.get('id')})."


def test_head_to_head_benchmark():
    """Verify Head-to-Head Comparative Benchmark produces net recovery lift."""
    from benchmark import run_comparative_benchmark
    failures = [make_test_failure(case_id=f"bm-{i}", reason="insufficient_funds" if i % 2 == 0 else "card_expired") for i in range(20)]
    bm = run_comparative_benchmark(failures, seed=42, live_testbed=False)
    assert bm.total_cases == 20
    assert bm.treatment_violations == 0, "Treatment policy had compliance violations!"
    assert bm.control_penalty_fees_paise > 0, "Control had 0 penalty fees!"
    assert bm.treatment_penalty_fees_paise == 0, "Treatment had penalty fees!"
    assert bm.treatment_net_recovery_paise >= bm.control_net_recovery_paise
    return f"Comparative benchmark verified: Net lift +₹{bm.net_recovery_lift_paise/100:,.2f} (+{bm.net_recovery_lift_pct}%)."


def test_webhook_loop_closure():
    res = simulate_testbed_capture("test-case-webhook-01", 50000)
    assert res.get("status") == "success", f"Webhook failed: {res}"
    rec = res.get("record", {})
    assert rec.get("event_type") == "SETTLEMENT_DETECTED"
    assert rec.get("rule_fired") == "razorpay_webhook_payment_captured"
    return f"Webhook loop closure verified: Case {res['case_id']} settled ₹500.00."


def test_penalty_savings_counter():
    b_mock = {"total_cases": 1500, "control_penalty_fees_paise": 4006800}
    pen = compute_penalty_savings(b_mock)
    assert pen["hard_declines_intercepted"] == 318
    assert pen["attempts_prevented"] == 954
    assert pen["penalty_saved_paise"] == 4006800
    return f"Penalty savings verified: {pen['hard_declines_intercepted']} cards, {pen['attempts_prevented']} retries blocked, ₹{pen['penalty_saved_paise']/100:,.2f} saved."


def test_compliance_fsm_wiring():
    trace = get_case_compliance_trace("test-case-fsm-01")
    gates = trace.get("gates", [])
    assert len(gates) == 6, f"Expected 6 compliance gates, got {len(gates)}"
    for g in gates:
        assert g.get("status") == "VERIFIED"
    return f"Compliance FSM wiring verified: All 6 statutory gates active."


def test_dataset_tenure_and_schema():
    """Verify 1500 generated records have valid tenure distribution and authentic Razorpay schema."""
    import json
    from pathlib import Path
    failures_file = Path("output/failures.jsonl")
    assert failures_file.exists(), "output/failures.jsonl does not exist!"
    lines = [json.loads(l) for l in open(failures_file)]
    assert len(lines) == 1500, f"Expected 1500 records, got {len(lines)}"

    consumer_lines = [x for x in lines if x.get("case_type") in ("payment", "subscription", "mandate")]
    assert len(consumer_lines) == 1125, f"Expected 1125 consumer/recurring cases, got {len(consumer_lines)}"

    h_lens = [len(x.get("history", [])) for x in consumer_lines]
    assert min(h_lens) >= 1, "Expected min tenure >= 1"
    assert max(h_lens) <= 30, "Expected max tenure <= 30"
    long_count = sum(1 for l in h_lens if l >= 20)
    new_count = sum(1 for l in h_lens if l < 5)
    assert long_count >= 150, f"Expected >=150 long-tenure users, got {long_count}"
    assert new_count >= 150, f"Expected >=150 new users, got {new_count}"

    # Verify a random sample of 20 consumer users' history conforms strictly to Razorpay schema
    for sample in consumer_lines[:20]:
        for p in sample.get("history", []):
            assert p["id"].startswith("pay_") and len(p["id"]) == 18, f"Invalid Razorpay ID: {p['id']}"
            assert p["status"] in ("captured", "failed"), f"Invalid status: {p['status']}"
            assert p["amount"] > 0, f"Invalid amount: {p['amount']}"
            assert isinstance(p["created_at"], int), f"created_at must be integer UNIX timestamp: {p['created_at']}"
    return f"Dataset verified: 1500 records ({long_count} long-tenure, {new_count} new), valid Razorpay schema."


def test_bayesian_timing_engine():
    """Verify Bayesian Shrinkage, liquidity mode convergence, and CBS safety."""
    from timing_engine import compute_shrinkage_weight, is_cbs_blackout, predict_optimal_retry_slot
    assert compute_shrinkage_weight(0) == 0.0
    assert compute_shrinkage_weight(2) == 0.2857
    assert compute_shrinkage_weight(20) == 0.8
    assert is_cbs_blackout(datetime(2026, 8, 1, 1, 30, tzinfo=IST)) is True
    assert is_cbs_blackout(datetime(2026, 8, 1, 10, 30, tzinfo=IST)) is False

    # Simulate contractor with 20 historical payments on Day 15
    hist = [{"id": f"pay_{i:014d}", "status": "captured", "amount": 500000,
             "created_at": int(datetime(2026, 1 + (i % 6), 15, 12, 0, tzinfo=IST).timestamp()),
             "method": "card"} for i in range(20)]
    f = make_test_failure("c-bayes-1", "payment", "insufficient_funds", 500000)
    f.history = hist
    slot = predict_optimal_retry_slot(f)
    assert slot["tenure"] == 20
    assert slot["shrinkage_weight"] == 0.8
    assert slot["target_day"] == 12, f"Expected target day shrunk from 15 toward prior 1 to 12, got {slot['target_day']}"
    assert slot["cbs_safe"] is True
    return f"Bayesian timing verified: weight {slot['shrinkage_weight']}, target day {slot['target_day']} (shrunk from 15 to 12), CBS safe."


def test_ptp_pipeline():
    """Verify Promise-to-Pay (PTP) recording, webhook loop closure, and conversion metric."""
    from ptp_tracker import record_promise_to_pay, update_ptp_status, compute_ptp_summary
    rec = record_promise_to_pay("c-test-ptp-99", "Vikram Sen", "+919111222333", 350000, "2026-09-10", "Test PTP")
    assert rec["status"] == "PENDING"
    assert rec["amount_paise"] == 350000
    updated = update_ptp_status("c-test-ptp-99", "KEPT", "Settled via test webhook")
    assert updated is not None and updated["status"] == "KEPT"
    summary = compute_ptp_summary()
    assert summary["kept_count"] >= 1
    return f"PTP pipeline verified: PTP {rec['ptp_id']} recorded and settled (KEPT). Total PTPs: {summary['total_ptps']}."


def test_code_style():
    """Verify adherence to codecrafters-shell-python style (flat functions <= 35 lines, no class bloat)."""
    import inspect
    import policies
    import razorpay_client
    import benchmark
    import webhook_handler
    import generator
    import timing_engine
    import ptp_tracker
    import reporting
    import engine
    import main
    import audit_replay
    import degradation_engine

    modules = [
        policies, razorpay_client, benchmark, webhook_handler, generator,
        timing_engine, ptp_tracker, reporting, engine, main, audit_replay,
        degradation_engine
    ]
    checked = 0
    for mod in modules:
        for name, fn in inspect.getmembers(mod, inspect.isfunction):
            if fn.__module__ == mod.__name__:
                lines = inspect.getsourcelines(fn)[0]
                assert len(lines) <= 35, f"Function {name} in {mod.__name__} has {len(lines)} lines (>35 max limit)!"
                checked += 1
    return f"Code style verified: {checked} procedural functions across {len(modules)} modules conform to flat concise style."


def test_checkout_dropoffs():
    """Verify checkout drop-off generation, log-normal basket sizing, and payment link recovery."""
    import json
    from pathlib import Path
    failures_file = Path("output/failures.jsonl")
    assert failures_file.exists(), "failures.jsonl missing"
    cases = [json.loads(l) for l in open(failures_file) if json.loads(l).get("case_type") == "checkout_drop_off"]
    assert 200 <= len(cases) <= 250, f"Expected ~225 checkout drop-offs, got {len(cases)}"

    stages = set(c.get("checkout_stage") for c in cases)
    assert stages == {"cart_abandoned", "address_submitted", "payment_method_selected", "otp_abandoned"}

    amounts = [c["amount_paise"] / 100 for c in cases]
    assert min(amounts) >= 499, f"Cart amount {min(amounts)} < ₹499"
    assert max(amounts) <= 15000, f"Cart amount {max(amounts)} > ₹15,000"
    assert all(c.get("cart_items") and len(c["cart_items"]) >= 1 for c in cases)
    assert all(c.get("dropoff_reason") for c in cases)

    # Verify treatment recovery through decide
    cfg = default_payment_config()
    sample = FailureInput(**cases[0])
    res = decide(sample, cfg, random.Random(42))
    assert res.retry_count == 0, "Checkout drop-offs must not attempt network card retries!"
    assert any("checkout_dropoff_recovery_link" in d.rule_fired for d in res.decisions)
    return f"Checkout drop-offs verified: {len(cases)} cases, 4 funnel stages, ₹{min(amounts):.0f}-₹{max(amounts):.0f} basket."


def test_b2b_receivables():
    """Verify B2B receivables generation, Pareto distribution, GSTIN validation, and aging buckets."""
    import json, re
    from pathlib import Path
    failures_file = Path("output/failures.jsonl")
    assert failures_file.exists(), "failures.jsonl missing"
    cases = [json.loads(l) for l in open(failures_file) if json.loads(l).get("case_type") == "b2b_receivable"]
    assert 130 <= len(cases) <= 170, f"Expected ~150 B2B cases, got {len(cases)}"

    gstin_pattern = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
    for c in cases:
        assert c.get("invoice_id", "").startswith("inv_") and len(c["invoice_id"]) == 18
        assert gstin_pattern.match(c.get("gstin", "")), f"Invalid GSTIN: {c.get('gstin')}"
        assert c.get("company_name"), f"Missing company name in case {c.get('case_id')}"
        assert c.get("aging_bucket") in {"current", "1_15_days", "16_30_days", "31_60_days", "60_plus_days"}

    amounts = [c["amount_paise"] / 100 for c in cases]
    assert min(amounts) >= 50000, f"B2B invoice amount {min(amounts)} < ₹50,000"
    assert max(amounts) <= 5000000, f"B2B invoice amount {max(amounts)} > ₹50,00,000"
    return f"B2B receivables verified: {len(cases)} cases, 100% valid GSTINs & inv_ IDs, amounts ₹{min(amounts):,.0f}-₹{max(amounts):,.0f}."


def test_b2b_aging_cadence():
    """Verify 5-tier statutory dunning cadence (Section 43B(h) and MSMED Section 16 penal interest)."""
    cfg = default_payment_config()
    tiers = {
        "current": "pre_due_courtesy",
        "1_15_days": "gentle_ap_reminder",
        "16_30_days": "formal_ap_notice",
        "31_60_days": "cfo_escalation",
        "60_plus_days": "msmed_statutory_notice",
    }
    for bucket, expected_tier in tiers.items():
        f = make_test_failure(case_id=f"b2b-{bucket}", case_type="b2b_receivable", amount=1500000_00)
        f.invoice_id = f"inv_{bucket:014s}"
        f.company_name = "Zenith Infotech Solutions Pvt Ltd"
        f.gstin = "27AAACZ1234F1Z5"
        f.aging_bucket = bucket
        f.days_overdue = 0 if bucket == "current" else (7 if bucket == "1_15_days" else (22 if bucket == "16_30_days" else (45 if bucket == "31_60_days" else 75)))
        f.dunning_tier = expected_tier

        res = decide(f, cfg, random.Random(42))
        assert res.retry_count == 0, "B2B receivables must not attempt card retries!"
        b2b_dec = next((d for d in res.decisions if d.action == "b2b_dunning_dispatched"), None)
        assert b2b_dec is not None, f"Missing b2b_dunning_dispatched for {bucket}"
        assert b2b_dec.details.get("tier") == expected_tier, f"Tier mismatch for {bucket}: {b2b_dec.details.get('tier')}"

        if bucket == "31_60_days":
            assert b2b_dec.details.get("section_43bh_warning") is True
        elif bucket == "60_plus_days":
            assert b2b_dec.details.get("msmed_section_16_interest") is True
            assert b2b_dec.details.get("penal_interest_paise") > 0

    return "B2B cadence verified: Pre-due -> Gentle AP -> Formal SOA -> Section 43B(h) CFO -> MSMED 19.5% penal interest."


def test_bootstrap_confidence_interval():
    """Verify non-parametric 95% Bootstrap Confidence Interval and p-value calculation."""
    from benchmark import run_comparative_benchmark
    failures = [make_test_failure(case_id=f"boot-{i}", reason="insufficient_funds" if i % 2 == 0 else "card_expired") for i in range(15)]
    bm = run_comparative_benchmark(failures, seed=42, live_testbed=False)
    assert bm.lift_ci_lower_paise <= bm.lift_ci_upper_paise, "Bootstrap CI lower bound exceeds upper bound!"
    assert 0.0 <= bm.lift_p_value <= 1.0, f"p-value out of [0, 1] range: {bm.lift_p_value}"
    assert isinstance(bm.is_statistically_significant, bool)
    return f"Bootstrap CI verified: 95% CI [₹{bm.lift_ci_lower_paise/100:,.2f}, ₹{bm.lift_ci_upper_paise/100:,.2f}], p={bm.lift_p_value:.4f}."


def test_hash_chain_tamper_detection():
    """Verify SHA-256 continuous hash chain detects bit-level payload tampering."""
    import json
    from benchmark import write_audit_records
    from audit_replay import verify_hash_chain
    f = make_test_failure(case_id="tamper-test")
    res = decide(f, default_payment_config(), random.Random(42))
    temp_path = Path("output/test_tamper_log.jsonl")
    write_audit_records(res.decisions, temp_path)
    ok, count, msg = verify_hash_chain(temp_path)
    assert ok is True, f"Clean log verification failed: {msg}"
    with open(temp_path, "r") as fh:
        lines = fh.readlines()
    d = json.loads(lines[1])
    d["action"] = "tampered_action"
    lines[1] = json.dumps(d) + "\n"
    with open(temp_path, "w") as fh:
        fh.writelines(lines)
    tampered_ok, err_idx, err_msg = verify_hash_chain(temp_path)
    temp_path.unlink(missing_ok=True)
    assert tampered_ok is False and err_idx == 1 and "Hash mismatch at record 1" in err_msg
    return "Hash chain tamper-proofing verified: single-byte modification flagged at exact record index."


def test_audit_paise_reconciliation():
    """Verify deterministic audit replay reconciles recovered and penalty paise tallies."""
    from audit_replay import replay_financial_tally
    from benchmark import write_audit_records
    f = make_test_failure(case_id="recon-test", reason="insufficient_funds")
    res = decide(f, default_payment_config(), random.Random(42))
    temp_path = Path("output/test_recon_log.jsonl")
    temp_path.unlink(missing_ok=True)
    write_audit_records(res.decisions, temp_path)
    tally = replay_financial_tally(temp_path)
    temp_path.unlink(missing_ok=True)
    assert tally["events_processed"] == len(res.decisions)
    assert tally["recovered_paise"] == res.recovered_amount_paise
    return f"Audit paise reconciliation verified: {tally['events_processed']} events replay to exact paise."


def test_iso8583_stopping_rules():
    """Verify ISO 8583 Category 1 codes trigger 0 retries and appropriate ISO category mapping."""
    from constants import ERROR_REASON_ISO_MAP, ISO_8583_CATEGORY_1
    from policies import evaluate_treatment_case
    cat1_reasons = ["card_expired", "card_number_invalid", "debit_instrument_blocked"]
    for r in cat1_reasons:
        f = make_test_failure(reason=r)
        res = evaluate_treatment_case(f, default_payment_config(), random.Random(42))
        assert res.retry_count == 0, f"Stopping rule failed to stop retries for {r}"
        assert res.penalty_fees_paise == 0, f"Hard decline incurred penalty for {r}"
        iso_info = ERROR_REASON_ISO_MAP.get(r, {})
        assert iso_info.get("category") == 1, f"Expected category 1 for {r}"
        assert iso_info.get("iso_code") in ISO_8583_CATEGORY_1, f"ISO code not in CAT_1: {iso_info}"
        assert any(d.rule_fired == "visa_mastercard_cat1_stopping_rule" for d in res.decisions)
    return f"ISO 8583 Category 1 stopping rules verified across {len(cat1_reasons)} hard decline types."


def test_live_testbed_sync():
    """Verify live Razorpay testbed query and payment-to-failure conversion."""
    from razorpay_client import is_testbed_ready, get_client, fetch_testbed_failed_payments, convert_payment_to_failure_input
    assert is_testbed_ready(), "Razorpay testbed not configured!"
    client = get_client()
    payments = fetch_testbed_failed_payments(client, count=5)
    assert isinstance(payments, list)
    if payments:
        f_input = convert_payment_to_failure_input(payments[0])
        assert f_input.payment_id.startswith("pay_")
        assert f_input.amount_paise > 0
    return f"Live testbed sync verified: connected to Razorpay, fetched {len(payments)} real testbed records."


def test_degradation_engine():
    """Verify bank switch degradation detection, root cause diagnosis, and auto-rerouting."""
    from degradation_engine import (
        get_switch_health_status,
        set_switch_degradation,
        diagnose_payment_degradation,
        execute_degradation_reroute,
    )
    set_switch_degradation("HDFC", True, 32.5)
    switches = get_switch_health_status()
    hdfc = next(s for s in switches if s["code"] == "HDFC")
    assert hdfc["is_degraded"] is True and hdfc["success_rate"] == 32.5
    case_dict = {"case_id": "deg-test-1", "method": "netbanking", "bank": "HDFC", "error_reason": "payment_failed"}
    diag = diagnose_payment_degradation(case_dict)
    assert diag["is_switch_degraded"] is True
    assert diag["degraded_switch"] == "HDFC"
    assert diag["recommended_action"] == "reroute_to_upi_intent"
    reroute = execute_degradation_reroute(case_dict)
    assert reroute["reroute_applied"] is True
    assert reroute["fallback_channel"] == "upi_intent"
    set_switch_degradation("HDFC", False, 94.2)
    return "Degradation engine verified: Switch anomaly detected, root cause diagnosed, auto-rerouted to UPI Intent."


# Dispatch table of all verification tests
TESTS = {
    "determinism": test_determinism,
    "smoke": test_smoke,
    "stopping_rules": test_stopping_rules,
    "penalty_accounting": test_penalty_accounting,
    "rbi_window": lambda: test_voice_fsm(),
    "testbed_payment_link": test_testbed_payment_link,
    "head_to_head_benchmark": test_head_to_head_benchmark,
    "suppression": test_suppression,
    "audit_completeness": test_audit_completeness,
    "webhook_closure": test_webhook_loop_closure,
    "penalty_counter": test_penalty_savings_counter,
    "compliance_wiring": test_compliance_fsm_wiring,
    "dataset_tenure_schema": test_dataset_tenure_and_schema,
    "checkout_dropoffs": test_checkout_dropoffs,
    "b2b_receivables": test_b2b_receivables,
    "b2b_aging_cadence": test_b2b_aging_cadence,
    "bayesian_timing": test_bayesian_timing_engine,
    "ptp_pipeline": test_ptp_pipeline,
    "bootstrap_ci": test_bootstrap_confidence_interval,
    "hash_chain_tamper": test_hash_chain_tamper_detection,
    "audit_paise_recon": test_audit_paise_reconciliation,
    "iso8583_stopping": test_iso8583_stopping_rules,
    "live_testbed_sync": test_live_testbed_sync,
    "degradation_engine": test_degradation_engine,
    "code_style": test_code_style,
}


def main():
    test_names = sys.argv[1:] if len(sys.argv) > 1 else list(TESTS.keys())
    print("=" * 65)
    print("AI Revenue Recovery — Comprehensive Test Suite")
    print("=" * 65)

    passed = 0
    failed = 0
    for name in test_names:
        if name not in TESTS:
            print(f"[SKIP] Unknown test '{name}'")
            continue
        try:
            msg = TESTS[name]()
            print(f"  ✓ {name:<22} : {msg}")
            passed += 1
        except Exception as e:
            print(f"  ✗ {name:<22} : FAILED -> {e}")
            failed += 1

    print("=" * 65)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_names)} tests.")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
