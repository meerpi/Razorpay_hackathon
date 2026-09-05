# Autonomous Revenue Recovery for Razorpay

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js 15](https://img.shields.io/badge/next.js-15.5-black.svg?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-25%2F25%20passing-success.svg?style=flat-square)]()
[![Razorpay API](https://img.shields.io/badge/razorpay-testbed%20live-0C2340.svg?style=flat-square&logo=razorpay&logoColor=white)](https://razorpay.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)]()

---

Most payment recovery is dumb: a failed transaction gets retried on a fixed schedule, regardless of *why* it failed, whether the bank's switch is having a bad day, or whether it's 2 a.m. and nobody should be getting a collections call anyway. That blind persistence costs real money — card-network penalties for hammering dead cards, conversion lost to retrying through a bank rail that's already degraded, and regulatory exposure for contacting people outside RBI's permitted hours.

This project replaces that loop with a decision engine that actually reasons about each failure: classifies why it happened, checks whether the rail it's routing through is healthy, respects RBI/TRAI/MSMED compliance windows, times outreach against when the customer is likely to actually have money, and dispatches recovery through the right channel — a payment link, a compliant voicebot call, or a human. Every decision lands in an append-only, hash-chained audit ledger, so none of it is a black box.

It's two pieces:
- **Python Decision Engine**: Handles classification, statutory compliance, Bayesian timing, rail failover, and live Razorpay testbed API calls.
- **Next.js Command Console**: Gives operators real-time visibility into active channels, switch health, compliance gates, and ledger integrity.

---

## What It Actually Does

Every failed payment moves through six deterministic stages:

```
[Webhook: Payment Failed]
   │
   ├── 1. Classify (engine.py)
   │      Hard decline (dead card, zero retries) vs. Soft decline vs. Technical gateway error
   │
   ├── 2. Check Rail Health (degradation_engine.py)
   │      Is HDFC / SBI / ICICI / Axis healthy? If degraded, auto-failover to UPI Intent
   │
   ├── 3. Enforce Statutory Compliance (policies.py)
   │      RBI calling window (08:00–19:00 IST), TRAI 1601 header, ₹15k e-mandate AFA ceiling, MSME §43B(h)
   │
   ├── 4. Time Outreach (timing_engine.py)
   │      Bayesian shrinkage against customer payment history; skip 23:30–03:30 core-banking blackout
   │
   ├── 5. Dispatch Recovery (voice_fsm.py / razorpay_client.py)
   │      Dynamic Smart PayLink, Hinglish compliant voicebot, or human escalation
   │
   └── 6. Audit & Seal (audit_replay.py)
          Append-only SHA-256 hash chain with tamper-evident replay verification
```

> **Human-in-the-Loop (HITL) Discipline**: Ten explicit triggers across four categories immediately hand a case to a human instead of letting the agent act alone — customer disputes, DNC opt-outs, classifier confidence under 80%, single transactions over ₹50k, and high-risk flags (full list in `DESIGN.md`). The amber *"needs review"* state is reserved exclusively for these triggers. If you see it, a person is genuinely needed — it's not a decoration.

---

## The Operations Console

`app/` is a Next.js console structured with one dedicated view per operational concern:

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Overview & Scoreboard** | Topline recovered revenue, recovery rate by product line, decline severity, and MSME aging. |
| `/queue` | **Case Queue Blotter** | Every case in flight with real-time status badges, filtering by failure rail, and drilldown inspection. |
| `/compliance` | **Compliance & Gating** | Real-time audit of statutory rules (RBI, TRAI, DPDP, MSME) currently being enforced. |
| `/audit-ledger` | **Cryptographic Ledger** | The SHA-256 hash chain with a **"Simulate 1-Byte Tamper"** test that proves the replay check catches tampering. |
| `/switch-health` | **Switch & Rail Health** | Per-bank success rates and latencies, featuring manual degrade/restore controls for live demos. |
| `/active-channels`| **Active Channels** | Real-time telemetry on active voicebot calls, generated PayLinks, and Promise-to-Pay (PTP) commitments. |
| `/test-runner` | **Single-Case Simulator** | Feed in phone, amount, and decline reason to watch the real engine generate a live Razorpay link. |

---

## The Numbers

On a benchmark run (`python main.py benchmark 42`) against a synthetic cohort of 1,500 failed transactions — about ₹2.56 Cr at risk, calibrated to published industry decline/recovery distributions (Recurly, Baymard, Juspay), not live merchant traffic — the agent recovers considerably more than a naive fixed-schedule retry policy:

| Metric | Control (Naive Baseline) | Treatment (AI Agent) | Impact |
| :--- | :---: | :---: | :--- |
| **Gross Value Recovered** | ~15% | **~65%** | **+445% Relative Net Lift** |
| **Statutory Breaches** | Frequent (unbounded calling) | **0 Violations** | 100% compliant across every run |
| **Card Network Penalties** | High (blind retries on dead cards) | **₹0.00** | Hard declines get zero retries, always |
| **Statistical Rigor** | — | **p = 0.02** | 95% Bootstrap CI: `[₹60, ₹8,864]` per case (1k resamples) |

*Exact totals shift slightly between runs as cohorts regenerate. `output/recovery_summary.json` (read live by the dashboard) and `impact_report.md` (the standalone RCT writeup) are the operational sources of truth.*

---

## Running Locally

### 1. Python Engine Setup
```bash
# Clone repository
git clone https://github.com/meerpi/Razorpay_hackathon.git
cd Razorpay_hackathon

# Initialize virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

*(Optional — only needed to hit live Razorpay testbed APIs instead of the built-in mock fallback)*:
```bash
# .env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### 2. Next.js Dashboard Setup
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## CLI Reference

`main.py` runs as an interactive REPL shell (patterned after the Codecrafters "build your own shell" exercise), or you can dispatch single commands directly:

```bash
python main.py benchmark 42                # Run naive-vs-agent benchmark over 1,500 cases
python main.py run 42                      # Execute decision engine over a fresh batch
python main.py sync 10                     # Ingest real failed payments from Razorpay testbed
python main.py audit                       # Verify SHA-256 ledger integrity end-to-end
python main.py aging                       # Inspect B2B receivables aging & §43B(h) schedule
python main.py dropoffs                    # Inspect checkout drop-off funnel breakdown
python main.py ptp                         # Inspect Promise-to-Pay pipeline commitments
python main.py voice successful_recovery   # Run scripted Hinglish voicebot compliance scenario
python main.py testbed                     # Validate live Razorpay API credentials
```

---

## Further Reading

- **`DESIGN.md`**: Complete design-system specification — elevation tokens, typography budget, full 10-trigger HITL criteria, and Blade HIG UI vocabulary.
- **`impact_report.md`**: Standalone econometric Randomized Controlled Trial (RCT) report, isolated from runtime operations so evaluation benchmarks remain clean.
