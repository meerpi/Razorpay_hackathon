# Razorpay Autonomous AI Revenue Recovery Agent — Design System Specification
**Version:** 1.0.0 (2026 Hackathon Edition)  
**Codename:** Command Deck  
**Philosophy:** Fusion of Apple Human Interface Guidelines (2025 Liquid Glass) & Razorpay Blade

---

## 1. Operating Model & Purpose

The **Razorpay Autonomous AI Revenue Recovery Agent** console is an event-driven, transaction-by-transaction operational command deck. It monitors, classifies, and remediates failed payment events in real time. 

### Core Tenet: Aggregates are a Doorway, Not a Wall
- **The Dual Audience:** Built for hackathon judges evaluating system efficacy and Razorpay/merchant risk-ops and finance operators whose primary KPI is *"how much revenue did we recover across this batch."*
- **The Doorway Principle:** The primary landing page (`/`) immediately answers the topline financial question using live metrics from `output/recovery_summary.json` (₹1.66 Cr recovered across 1,500 cases, 44.9% case rate, 64.9% value rate). Every single metric card, product rail, and decline class serves as an interactive doorway that deep-links directly into the filtered transaction blotter at `/queue`.
- **Verifiable Engine Integration:** The operational UI is wired directly to Python engine outputs (`output/cases.jsonl`, `output/audit_log.jsonl`, `output/benchmark_results.json`) and supports on-demand batch evaluation (`python main.py benchmark 42`).

---

## 2. Visual Language: "Command Deck"

The aesthetic bridges two high-trust institutional languages:
1. **Apple Human Interface Guidelines (Liquid Glass 2025):** Translucent material that reflects and refracts background context, floating layered planes communicating hierarchy without heavy boxes, disciplined typography, and restrained specular highlights.
2. **Razorpay Blade Design System:** Deep structural navy (`#192839`), high-contrast dark canvas (`#0B0F17`), and saturated signal blue (`#3395FF`) representing money-in-motion and automation.
3. **The Reserved Accent Rule:** A warm amber (`#F5A623`) is **exclusively reserved** for human-in-the-loop (HITL) exception routing. If something is amber, a human must intervene. It is never used for decoration or general warnings.

---

## 3. Formalized Design Tokens

### 3.1 Color Tokens

#### Dark Mode (Primary / Default)
```css
:root, [data-theme="dark"] {
  /* Canvas & Structural */
  --canvas:             #0B0F17;  /* Base background, deep navy-black */
  --canvas-raised:      #10182A;  /* Elevated navigation, headers, cards */
  --canvas-overlay:     #131E35;  /* Higher elevation modals and drawers */

  /* Liquid Glass Material */
  --glass-bg:           rgba(255, 255, 255, 0.045);
  --glass-bg-hover:     rgba(255, 255, 255, 0.075);
  --glass-border:       rgba(255, 255, 255, 0.09);
  --glass-highlight:    rgba(255, 255, 255, 0.14); /* 1px top specular hairline */
  --glass-blur:         28px;
  --glass-saturate:     140%;

  /* Typography Colors */
  --text-primary:        #F4F6FA;  /* High contrast readable text */
  --text-secondary:      #93A0B4;  /* Metadata, labels, subtle details */
  --text-tertiary:       #5C6B82;  /* Timestamps, disabled text, borders */

  /* Razorpay Brand Accents */
  --brand-blue:          #3395FF;  /* Action / Automation / Money-in-motion */
  --brand-blue-dim:      #1E5FA8;  /* Subtle active indicators */
  --brand-blue-glow:     rgba(51, 149, 255, 0.20);
  --brand-navy:          #192839;  /* Structural headers & badges */

  /* Human-in-the-Loop Accent (RESERVED) */
  --human-amber:         #F5A623;  /* RESERVED: Needs human attention ONLY */
  --human-amber-glow:    rgba(245, 166, 35, 0.25);
  --human-amber-subtle:  rgba(245, 166, 35, 0.10);

  /* Semantic State Accents */
  --success-teal:        #2FD1A6;  /* Case resolved / promise kept / compliant */
  --success-teal-glow:   rgba(47, 209, 166, 0.20);
  --danger-crimson:      #F2545B;  /* Hard decline / regulatory breach / broken PTP */
  --danger-crimson-glow: rgba(242, 84, 91, 0.20);
  --neutral-slate:       #64748B;  /* Inactive / closed / no-data */
}
```

#### Light Mode (Secondary / Toggleable)
```css
[data-theme="light"] {
  --canvas:             #F6F7FA;
  --canvas-raised:      #FFFFFF;
  --canvas-overlay:     #F0F3F8;

  --glass-bg:           rgba(25, 40, 57, 0.035);
  --glass-bg-hover:     rgba(25, 40, 57, 0.065);
  --glass-border:       rgba(25, 40, 57, 0.10);
  --glass-highlight:    rgba(255, 255, 255, 0.80);

  --text-primary:        #101826;
  --text-secondary:      #5B6B81;
  --text-tertiary:       #8A9BB2;

  --brand-blue:          #2E7FE0;
  --brand-blue-dim:      #99C5F7;
  --brand-blue-glow:     rgba(46, 127, 224, 0.15);
  --brand-navy:          #192839;

  --human-amber:         #C97A00;
  --human-amber-glow:    rgba(201, 122, 0, 0.20);
  --human-amber-subtle:  rgba(201, 122, 0, 0.08);

  --success-teal:        #0E9F6E;
  --danger-crimson:      #D92534;
  --neutral-slate:       #64748B;
}
```

---

### 3.2 Typography Tokens

- **UI Font Family (`--font-ui`):** `"Inter"`, `"Geist"`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Monospace Font Family (`--font-mono`):** `"JetBrains Mono"`, `"IBM Plex Mono"`, "SFMono-Regular", Menlo, Monaco, Consolas, monospace
  - **Rule:** Monospace with `font-variant-numeric: tabular-nums` is required on **every** ₹ currency amount, percentage, latency (ms), timestamp, hash, and identifier.

| Style Role | Font Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| **Display** | 28px | 34px | 650 | -0.02em | Case headline amount inside Case Detail ONLY |
| **Title** | 20px | 26px | 600 | -0.01em | Screen headers, panel headers |
| **Body** | 15px | 22px | 450 | normal | Main interface text, descriptions |
| **Label** | 13px | 16px | 550 | +0.02em (uppercase) | Table headers, section eyebrows |
| **Caption** | 12px | 16px | 450 | normal | Timestamps, micro-badges, hints |
| **Numeric** | Inherited | Inherited | 450-600 | 0 (tabular-nums) | ALL amounts, ms, % latencies, hashes |

---

### 3.3 Elevation, Geometry & Motion

- **Corner Radii:**
  - `radius-sm`: `8px` (Chips, status badges, micro-indicators)
  - `radius-md`: `12px` (Inputs, buttons, dropdown popovers)
  - `radius-lg`: `16px` (Table rows, rail cards, content panels)
  - `radius-xl`: `24px` (Case Detail sliding sheet, modals)
- **Glass Panel Surface:**
  - `background: var(--glass-bg);`
  - `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));`
  - `border: 1px solid var(--glass-border);`
  - `border-top: 1px solid var(--glass-highlight);`
- **Shadows & Glows:** No harsh drop shadows. Semantic states use ambient glow:
  - Needs Review: `box-shadow: 0 0 16px var(--human-amber-glow), inset 0 1px 0 var(--glass-highlight);`
  - In Progress: `box-shadow: 0 0 12px var(--brand-blue-glow);`
  - Resolved: Visual recession with lower opacity (`0.75`), no ambient glow.
- **Motion:**
  - Framer Motion Spring: `stiffness: 220, damping: 26, duration: 180-240ms`.
  - Quiet arrivals: New incoming transactions slide down subtly with opacity fade. No celebratory confetti or bounce animations.

---

## 4. Human-in-the-Loop (HITL) Exception Architecture

Autonomous operation is bounded by regulation and policy. A case is flagged with **Needs review** (`--human-amber`) if and only if one of four explicit triggers fires:

1. **Regulatory Override Triggers:**
   - Customer explicit dispute via voicebot or webhook.
   - Do-Not-Call (DNC) or opt-out request under DPDP Act / TRAI regulations.
   - Voicebot Right-Party Verification (RPV) failure after 2 retries or explicit request for human operator.
   - RBI E-mandate debit exceeding ₹15,000 Additional Factor Authentication (AFA) ceiling.
   - B2B receivable nearing Section 43B(h) statutory 45-day deadline (< 48 hours remaining).
2. **Confidence & Novelty Triggers:**
   - Machine classification confidence `< 80.0%`.
   - Unknown/unmapped decline code.
   - Multi-rail switch degradation (potential false-positive telemetry).
3. **Financial Exposure Triggers:**
   - Single transaction exposure `> ₹50,000.00` (configurable threshold).
4. **Governance / Audit Sampling:**
   - Systematic sampling of auto-resolved transactions for human sign-off per RBI supervisory expectations.

---

## 5. UI Vocabulary & Anti-Patterns

### Approved Terminology
- **Bank Rails:** `HDFC`, `SBI · NPCI`, `ICICI`, `AXIS`, `UPI Intent (PhonePe/GPay/Paytm)` (Wordmark badges only, no third-party bank logos).
- **ISO 8583 Categories:** `Category 1 (Hard Decline)`, `Category 2 (Wait & Retry)`, `Category 3 (Correct & Retry)`.
- **Statutory Frameworks:** `RBI Calling Window (08:00–19:00 IST)`, `TRAI 1601 DLT Header`, `MSMED Act §43B(h)`, `Nocturnal CBS Blackout (23:30–03:30 IST)`.
- **Voicebot FSM States:** `CALLING_WINDOW_CHECK`, `RIGHT_PARTY_VERIFICATION`, `LENDER_DISCLOSURE`, `PAYMENT_DISCUSSION`, `PTP_COMMITTED`, `HUMAN_ESCALATION`.

### Explicit Prohibitions
- No emoji icons (Lucide line icons with 1.5px stroke only).
- No purple-to-blue SaaS marketing gradients or gradient blobs.
- No hero KPI summary bars or revenue counters in the working dashboard.
- No proportional fonts for financial numbers.
