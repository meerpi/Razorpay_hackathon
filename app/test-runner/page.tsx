'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  FlaskConical,
  Play,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  PhoneCall,
  Link2,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { MonospaceAmount } from '@/components/ui/MonospaceAmount';
import { dataStore } from '@/lib/mock-data';
import Link from 'next/link';

export default function TestLabPage() {
  const [phone, setPhone] = useState<string>('+919820144821');
  const [name, setName] = useState<string>('Vikramaditya Sharma');
  const [email, setEmail] = useState<string>('vikram@example.com');
  const [amountRupees, setAmountRupees] = useState<number>(24500);
  const [caseType, setCaseType] = useState<string>('mandate');
  const [method, setMethod] = useState<string>('emandate');
  const [rail, setRail] = useState<string>('HDFC');
  const [errorReason, setErrorReason] = useState<string>('transaction_limit_exceeded');

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToBlotter, setAddedToBlotter] = useState<boolean>(false);

  const declineOptions = [
    { value: 'transaction_limit_exceeded', label: 'transaction_limit_exceeded (Soft · Triggers ₹15k AFA ceiling)', cat: 'Cat 2' },
    { value: 'card_expired', label: 'card_expired (Hard · ISO 8583 Cat 1 stopping rule · 0 retries)', cat: 'Cat 1' },
    { value: 'insufficient_funds', label: 'insufficient_funds (Soft · Bayesian payday timing schedule)', cat: 'Cat 2' },
    { value: 'payment_timed_out', label: 'payment_timed_out (Soft · Timeout retry schedule)', cat: 'Cat 2' },
    { value: 'gateway_technical_error', label: 'gateway_technical_error (Technical · Switch failover)', cat: 'Cat 2' },
    { value: 'debit_instrument_blocked', label: 'debit_instrument_blocked (Hard · Zero retry)', cat: 'Cat 1' },
  ];

  const handleRunRealCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAddedToBlotter(false);

    try {
      const res = await fetch('/api/run-test-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_phone: phone,
          customer_name: name,
          contact_email: email,
          amount_rupees: Number(amountRupees),
          case_type: caseType,
          method,
          rail,
          error_reason: errorReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Execution failed on backend');
      }

      setResult(data);

      // Add to in-memory blotter so it shows in Transaction Queue immediately
      dataStore.addRealExecutedCase(data);
      setAddedToBlotter(true);
    } catch (err: any) {
      setError(err.message || 'Error executing Python testbed runner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-brand-blue/50 bg-brand-blue/10 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue/20 text-brand-blue border border-brand-blue/40 flex items-center justify-center shrink-0 mt-0.5">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary font-mono tracking-tight flex items-center gap-2">
              <span>TEST LAB — ACTUAL PYTHON BACKEND &amp; RAZORPAY TESTBED EXECUTION</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-brand-blue text-white uppercase font-bold tracking-wider">
                100% Real API
              </span>
            </h1>
            <p className="text-xs text-text-secondary mt-1 font-sans leading-relaxed">
              Zero mock timers. Enter a phone number, amount, and decline code. This runner directly invokes{' '}
              <code className="text-brand-blue font-mono bg-canvas-raised px-1 py-0.5 rounded border border-glass-border">
                /home/meerpi/curr_project/Razorpay/.venv/bin/python3
              </code>{' '}
              and generates a <strong>genuine live Razorpay payment link</strong> on the testbed using your active API credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Form and Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleRunRealCase} className="p-5 rounded-xl glass-panel space-y-4 text-xs font-mono">
            <div className="text-xs uppercase font-bold text-text-primary border-b border-glass-border pb-2 flex items-center justify-between">
              <span>Input Test Parameters</span>
              <span className="text-[10px] text-text-tertiary">Real Execution</span>
            </div>

            {/* Customer Phone */}
            <div className="space-y-1.5">
              <label className="text-text-tertiary uppercase block">
                Customer Phone Number <span className="text-brand-blue">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                required
                className="w-full bg-canvas border border-glass-border rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-mono"
              />
              <p className="text-[10px] text-text-tertiary font-sans">
                Try <code className="text-human-amber">+919876543210</code> to test DNC suppression, or your own number.
              </p>
            </div>

            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-text-tertiary uppercase block">Customer Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Name"
                required
                className="w-full bg-canvas border border-glass-border rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-sans"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-text-tertiary uppercase block">Amount in ₹ (INR)</label>
              <input
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(Number(e.target.value))}
                min={1}
                required
                className="w-full bg-canvas border border-glass-border rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-mono tabular-nums"
              />
              <p className="text-[10px] text-text-tertiary font-sans">
                Amounts &gt; ₹15,000 on mandates trigger statutory AFA 2FA ceiling.
              </p>
            </div>

            {/* Decline Reason */}
            <div className="space-y-1.5">
              <label className="text-text-tertiary uppercase block">Decline Reason &amp; Scenario</label>
              <select
                value={errorReason}
                onChange={(e) => setErrorReason(e.target.value)}
                className="w-full bg-canvas border border-glass-border rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-mono"
              >
                {declineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Case Type & Method */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-text-tertiary uppercase block text-[10px]">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full bg-canvas border border-glass-border rounded-md px-2 py-1.5 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-mono"
                >
                  <option value="mandate">Mandate</option>
                  <option value="payment">One-Off Payment</option>
                  <option value="subscription">Subscription</option>
                  <option value="checkout_drop_off">Checkout Drop-off</option>
                  <option value="b2b_receivable">B2B Receivable</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-text-tertiary uppercase block text-[10px]">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-canvas border border-glass-border rounded-md px-2 py-1.5 text-text-primary text-xs focus:outline-none focus:border-brand-blue font-mono"
                >
                  <option value="emandate">E-Mandate</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Netbanking</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-xs font-mono font-bold bg-brand-blue text-white shadow-blue-glow hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing Python Engine &amp; Razorpay API...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>EXECUTE ON ACTUAL RAZORPAY TESTBED</span>
                </>
              )}
            </button>
          </form>

          {/* Quick links to clear queue */}
          <div className="p-3 rounded-lg glass-panel flex items-center justify-between text-xs font-mono">
            <span className="text-text-tertiary">Queue Management:</span>
            <button
              onClick={() => dataStore.clearCases()}
              className="text-danger-crimson hover:underline"
            >
              Clear Blotter to 0 cases
            </button>
          </div>
        </div>

        {/* Right Output: 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-4 rounded-xl border border-danger-crimson/50 bg-danger-crimson/15 text-danger-crimson text-xs font-mono">
              <div className="font-bold mb-1">Execution Error:</div>
              <div>{error}</div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="p-12 rounded-xl glass-panel text-center text-xs font-mono text-text-tertiary space-y-3">
              <Terminal className="w-8 h-8 text-brand-blue/60 mx-auto" />
              <div>Awaiting test execution.</div>
              <p className="font-sans text-[11px] max-w-sm mx-auto">
                Fill the parameters on the left and click execute to trigger the actual Python pipeline. The real output
                from Razorpay will render here.
              </p>
            </div>
          )}

          {loading && (
            <div className="p-12 rounded-xl glass-panel text-center text-xs font-mono text-text-tertiary space-y-3">
              <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
              <div className="text-brand-blue font-semibold">Contacting Razorpay Testbed API...</div>
              <p className="font-sans text-[11px]">
                Creating authentic payment link, calculating Bayesian timing shrinkage, and appending SHA-256 block.
              </p>
            </div>
          )}

          {result && (
            <div className="p-5 rounded-xl glass-panel space-y-4 text-xs font-mono animate-in fade-in duration-200">
              {/* Header with Case ID and Status */}
              <div className="flex items-start justify-between border-b border-glass-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-text-primary">{result.case_id}</span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-[10px] uppercase font-bold',
                        result.status === 'needs_review'
                          ? 'bg-human-amber/20 text-human-amber border border-human-amber/40 shadow-[0_0_10px_var(--human-amber-glow)]'
                          : result.status === 'closed'
                          ? 'bg-neutral-slate/20 text-text-tertiary'
                          : 'bg-brand-blue/20 text-brand-blue'
                      )}
                    >
                      {result.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    Customer: <span className="text-text-primary">{result.customer_name}</span> · {result.customer_phone}
                  </div>
                </div>

                <div className="text-right">
                  <MonospaceAmount amountRupees={result.amount_rupees} size="lg" />
                  <div className="text-[10px] text-success-teal">Verified Testbed Response</div>
                </div>
              </div>

              {/* REAL LIVE PAYMENT LINK BANNER */}
              {result.payment_link ? (
                <div className="p-3.5 rounded-lg border border-success-teal/40 bg-success-teal/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-success-teal flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Live Razorpay Payment Link Created</span>
                    </span>
                    <span className="text-[10px] text-text-tertiary">ID: {result.payment_link_id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-canvas/80 p-2 rounded border border-glass-border">
                    <span className="text-brand-blue font-bold truncate">{result.payment_link}</span>
                    <a
                      href={result.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-brand-blue text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-brand-blue/90 shrink-0"
                    >
                      <span>Open Real Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-neutral-slate/40 bg-canvas space-y-1">
                  <span className="text-[11px] text-text-tertiary uppercase">Payment Link Status:</span>
                  <p className="text-[11px] text-text-secondary">
                    {result.is_suppressed
                      ? 'No link generated: Customer phone is in DNC suppression list.'
                      : 'Card expired Category 1 hard decline: Automated retries suppressed per ISO 8583 rules.'}
                  </p>
                </div>
              )}

              {/* Statutory Gating Breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-glass-border">
                <div className="text-[11px] text-text-tertiary uppercase font-bold">
                  Statutory Invariants Evaluated by Backend:
                </div>
                <div className="space-y-1 text-[11px]">
                  {Object.entries(result.compliance_checks || {}).map(([key, gate]: any) => (
                    <div key={key} className="flex items-center justify-between p-1.5 rounded bg-canvas/60">
                      <span className="text-text-secondary">
                        {gate.passed ? '✓' : '⚠'} {key.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={clsx('font-bold', gate.passed ? 'text-success-teal' : 'text-human-amber')}>
                        {gate.passed ? 'PASSED' : 'FLAGGED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hinglish Voicebot FSM Speech Script */}
              {result.voice_script && (
                <div className="p-3 rounded-lg bg-canvas-raised border border-glass-border space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary uppercase">
                    <PhoneCall className="w-3.5 h-3.5 text-human-amber" />
                    <span>Hinglish Voicebot FSM Generated Speech:</span>
                  </div>
                  <p className="text-[11px] text-text-primary italic font-sans">&quot;{result.voice_script}&quot;</p>
                </div>
              )}

              {/* Decisions Trail */}
              <div className="space-y-1 pt-2 border-t border-glass-border">
                <div className="text-[11px] text-text-tertiary uppercase font-bold">
                  Decisions Logged by Engine:
                </div>
                <div className="space-y-1 text-[11px]">
                  {result.decisions?.map((d: any, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-canvas/40 border border-glass-border">
                      <span className="text-brand-blue font-semibold uppercase">{d.action}:</span>{' '}
                      <span className="text-text-secondary">{d.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHA-256 Audit Signature */}
              <div className="pt-2 border-t border-glass-border flex items-center justify-between text-[10px] text-text-tertiary">
                <span>SHA-256 Block #{result.audit_block_index}</span>
                <span className="truncate max-w-[280px] text-text-secondary">{result.audit_block_hash}</span>
                <span className="text-success-teal">Appended to audit_log.jsonl</span>
              </div>

              {/* View in Queue Button */}
              <div className="pt-2">
                <Link
                  href="/"
                  className="w-full py-2.5 rounded-lg bg-canvas-raised border border-brand-blue/40 text-brand-blue hover:bg-brand-blue/15 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View in Live Transaction Queue Blotter</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
