# Autonomous Revenue Recovery for Razorpay

Most payment recovery is dumb: a failed transaction gets retried on a fixed schedule, regardless of *why* it failed, whether the bank's switch is having a bad day, or whether it's 2 a.m. and nobody should be getting a collections call anyway. That blind persistence costs real money — card-network penalties for hammering dead cards, conversion lost to retrying through a bank rail that's already degraded, and regulatory exposure for contacting people outside RBI's permitted hours.

This project replaces that loop with a decision engine that actually reasons about each failure: classifies why it happened, checks whether the rail it's routing through is healthy, respects RBI/TRAI/MSMED compliance windows, times outreach against when the customer is likely to actually have money, and dispatches recovery through the right channel — a payment link, a compliant voicebot call, or a human. Every decision lands in an append-only, hash-chained audit ledger, so none of it is a black box.

It's two pieces: a Python engine that does the classification/compliance/routing work and talks to Razorpay's real testbed API, and a Next.js console that gives a person a live view into what the agent is doing and why.

## What it actually does

A failed payment moves through six stages:

```
webhook: payment failed
  → classify (engine.py): hard decline (dead card, never retry) vs. soft
    decline (worth retrying) vs. technical/gateway error
  → check rail health (degradation_engine.py): is HDFC / SBI / ICICI / Axis
    healthy right now? if not, fail over to UPI Intent
  → check compliance (policies.py): RBI calling window, TRAI 1601 header,
    ₹15k e-mandate AFA ceiling, MSME §43B(h) deadlines
  → time it (timing_engine.py): Bayesian shrinkage against the customer's
    own payment history, skipping the 23:30–03:30 core-banking blackout
  → dispatch: Smart PayLink, Hinglish voicebot (voice_fsm.py), or escalate
    to a human
  → log it (audit_replay.py): SHA-256 hash chain, tamper-evident replay
```

Ten explicit triggers, across four categories, hand a case to a human instead of letting the agent act alone — a customer dispute, a DNC opt-out, classifier confidence under 80%, a single transaction over ₹50k, and a few others (the full list is in `DESIGN.md`). The amber "needs review" state is reserved exclusively for those triggers. If you see it, a person is genuinely needed — it's not a decoration.

## The dashboard

None of the above is worth much if you can't see it happening. `app/` is a Next.js console with one page per concern:

- **Overview & Scoreboard** (`/`) — the topline recovery number, plus rate by product line, decline severity, and MSME aging, each filtering straight into the queue
- **Case Queue Blotter** (`/queue`) — every case in flight, filterable by status and rail
- **Compliance & Gating** (`/compliance`) — the RBI/TRAI/MSME rules currently being enforced, live
- **Cryptographic Ledger** (`/audit-ledger`) — the hash chain itself, with a "simulate 1-byte tamper" button that proves the replay check actually catches it
- **Switch & Rail Health** (`/switch-health`) — per-bank success rate and latency, with manual degrade/restore controls for demos
- **Active Channels** (`/active-channels`) — live voicebot / PayLink / promise-to-pay sessions in progress
- **Single-Case Simulator** (`/test-runner`) — feed in a phone number, amount, and decline reason, and the real pipeline generates a real Razorpay payment link

```bash
npm install
npm run dev   # http://localhost:3000
```

## The numbers

On a benchmark run (`python main.py benchmark 42`) against a synthetic cohort of 1,500 failed transactions — about ₹256 Cr at risk, calibrated to published industry decline/recovery distributions (Recurly, Baymard, Juspay), not live merchant traffic — the agent recovers considerably more than a naive fixed-schedule retry policy:

- ~65% of at-risk value recovered, vs. ~15% for the naive baseline — roughly **+445%** lift
- **Zero** statutory compliance breaches, every run
- **Zero** card-network penalties — hard declines get zero retries, always
- p = 0.02, 95% bootstrap CI [₹60, ₹8,864] per case, over 1,000 resamples

Exact totals shift a little between runs, since the cohort is regenerated each time. `output/recovery_summary.json` (read live by the dashboard) and `impact_report.md` (the standalone RCT writeup) are the sources of truth — not this paragraph.

## Running it locally

**Python engine**
```bash
git clone https://github.com/meerpi/Razorpay_hackathon.git
cd Razorpay_hackathon
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Optional — only needed to hit the live Razorpay testbed instead of the built-in mock fallback:
```bash
# .env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

**Dashboard**
```bash
npm install
npm run dev
```

## CLI reference

`main.py` also runs as a small REPL shell — written in the pattern of the Codecrafters "build your own shell" exercise — so it works with no arguments as an interactive prompt, or you can dispatch a single command directly:

```bash
python main.py benchmark 42                # naive-vs-agent benchmark over 1,500 cases
python main.py run 42                      # run the decision engine over a fresh batch
python main.py sync 10                     # pull real failed payments from the testbed
python main.py audit                       # verify the SHA-256 ledger, end to end
python main.py aging                       # B2B receivables aging / §43B(h) schedule
python main.py dropoffs                    # checkout drop-off funnel breakdown
python main.py ptp                         # promise-to-pay pipeline status
python main.py voice successful_recovery   # run a scripted Hinglish voicebot scenario
python main.py testbed                     # verify live Razorpay credentials
```

## Further reading

`DESIGN.md` has the full design-system spec — tokens, the complete HITL trigger list, UI vocabulary. `impact_report.md` is the standalone benchmark writeup, kept out of the live dashboard on purpose so operational numbers and evaluation numbers never get mixed up.
