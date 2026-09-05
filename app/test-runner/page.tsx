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
  ArrowLeft,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { MonospaceAmount } from '@/components/ui/MonospaceAmount';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CaseStatus } from '@/lib/types';
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
      {/* Header */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary mb-1">
          <Link href="/" className="hover:text-text-primary flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Overview Scoreboard
          </Link>
          <span>/</span>
          <span className="text-text-primary">Simulator</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Single-Case Recovery Simulator
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Simulate payment decline scenarios against autonomous policy rules, statutory compliance gates, and recovery link generation.
        </p>
      </div>

      {/* Form and Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleRunRealCase} className="p-5 rounded-md surface-panel space-y-4 text-xs font-mono">
            <div className="text-xs font-semibold text-text-primary border-b border-border-subtle pb-2 flex items-center justify-between">
              <span>Input test parameters</span>
              <span className="text-[10px] text-text-tertiary font-normal">Simulation parameters</span>
            </div>

            {/* Customer Phone */}
            <div className="space-y-1.5">
              <label className="text-text-secondary block font-medium">
                Customer phone number <span className="text-brand-default">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                required
                className="w-full bg-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-default font-mono"
              />
              <p className="text-[10px] text-text-tertiary font-sans">
                Try <code className="text-attention-emphasis">+919876543210</code> to test DNC suppression, or your own number.
              </p>
            </div>

            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-text-secondary block font-medium">Customer full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Name"
                required
                className="w-full bg-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-default font-sans"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-text-secondary block font-medium">Amount in ₹ (INR)</label>
              <input
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(Number(e.target.value))}
                min={1}
                required
                className="w-full bg-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-default font-mono tabular-nums"
              />
              <p className="text-[10px] text-text-tertiary font-sans">
                Amounts &gt; ₹15,000 on mandates trigger statutory AFA 2FA ceiling.
              </p>
            </div>

            {/* Decline Reason */}
            <div className="space-y-1.5">
              <label className="text-text-secondary block font-medium">Decline reason &amp; scenario</label>
              <select
                value={errorReason}
                onChange={(e) => setErrorReason(e.target.value)}
                className="w-full bg-canvas border border-border-subtle rounded-md px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-brand-default font-mono"
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
                <label className="text-text-secondary block font-medium text-[11px]">Case type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full bg-canvas border border-border-subtle rounded-md px-2 py-1.5 text-text-primary text-xs focus:outline-none focus:border-brand-default font-mono"
                >
                  <option value="mandate">Mandate</option>
                  <option value="payment">One-Off Payment</option>
                  <option value="subscription">Subscription</option>
                  <option value="checkout_drop_off">Checkout Drop-off</option>
                  <option value="b2b_receivable">B2B Receivable</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary block font-medium text-[11px]">Payment method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-canvas border border-border-subtle rounded-md px-2 py-1.5 text-text-primary text-xs focus:outline-none focus:border-brand-default font-mono"
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
              className="w-full py-3 rounded-md text-xs font-mono font-bold bg-brand-default text-white hover:bg-brand-emphasis transition-all flex items-center justify-center gap-2 mt-2 shadow-raised-low cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating Remediation Policy...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Recovery Simulation</span>
                </>
              )}
            </button>
          </form>

          {/* Quick links to reset queue */}
          <div className="p-3 rounded-md surface-panel flex items-center justify-between text-xs font-mono">
            <span className="text-text-tertiary">Benchmark Control:</span>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/engine/run-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seed: 42, mode: 'benchmark' }),
                  });
                  window.location.reload();
                } catch (e) {
                  setLoading(false);
                }
              }}
              className="text-text-secondary hover:text-brand-default hover:underline cursor-pointer"
            >
              Reset to 1,500 Benchmark Seed
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
            <div className="p-12 rounded-md surface-panel text-center text-xs font-mono text-text-tertiary space-y-3">
              <Terminal className="w-8 h-8 text-brand-default/60 mx-auto" />
              <div>Awaiting test simulation.</div>
              <p className="font-sans text-[11px] max-w-sm mx-auto text-text-secondary">
                Configure transaction parameters on the left to evaluate decline classification, compliance gating, and recovery dispatch.
              </p>
            </div>
          )}

          {loading && (
            <div className="p-12 rounded-md surface-panel text-center text-xs font-mono text-text-tertiary space-y-3">
              <div className="w-8 h-8 border-2 border-brand-muted border-t-brand-default rounded-full animate-spin mx-auto" />
              <div className="text-brand-emphasis font-semibold">Evaluating Remediation Policy...</div>
              <p className="font-sans text-[11px] text-text-secondary">
                Calculating Bayesian timing shrinkage, verifying compliance invariants, and generating recovery dispatch.
              </p>
            </div>
          )}

          {result && (
            <div className="p-5 rounded-md surface-panel space-y-4 text-xs font-mono animate-in fade-in duration-200">
              {/* Telemetry Synchronization Banner */}
              {result.metrics_updated && (
                <div className="p-3.5 rounded-sm border border-positive-muted bg-positive-subtle text-positive-default space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-positive-default" />
                      <span>Ledger Synchronized</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-positive-muted/20 border border-positive-muted font-bold">
                      N = {result.metrics_updated.new_total_cases.toLocaleString()} Cases
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary font-sans leading-relaxed">
                    Case recorded in transaction queue.
                    {result.metrics_updated.recovered ? (
                      <span>
                        {' '}Total revenue recovered across batch updated to{' '}
                        <strong className="text-positive-default font-mono">
                          ₹{result.metrics_updated.new_recovered_amount_rupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>.
                      </span>
                    ) : (
                      <span>
                        {' '}Zero-retry stopping rule enforced (saving penalty fines).
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                    <Link href="/queue" className="text-brand-default hover:underline flex items-center gap-1 font-medium">
                      <span>View in Queue Blotter</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <span className="text-border-default">·</span>
                    <Link href="/" className="text-brand-default hover:underline flex items-center gap-1 font-medium">
                      <span>View on Scoreboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Header with Case ID and Status */}
              <div className="flex items-start justify-between border-b border-border-subtle pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-text-primary">{result.case_id}</span>
                    <StatusBadge status={result.status as CaseStatus} size="sm" />
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    Customer: <span className="text-text-primary">{result.customer_name}</span> · {result.customer_phone}
                  </div>
                </div>

                <div className="text-right">
                  <MonospaceAmount amountRupees={result.amount_rupees} size="lg" />
                </div>
              </div>

              {/* PAYMENT LINK BANNER */}
              {result.payment_link ? (
                <div className="p-3.5 rounded-lg border border-positive-muted bg-positive-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-positive-default flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Razorpay Smart PayLink Generated</span>
                    </span>
                    <span className="text-[10px] text-text-tertiary font-mono">ID: {result.payment_link_id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-canvas/80 p-2 rounded border border-border-subtle">
                    <span className="text-brand-default font-bold truncate">{result.payment_link}</span>
                    <a
                      href={result.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-brand-default text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-brand-emphasis shrink-0"
                    >
                      <span>Open Payment Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-neutral-slate/40 bg-canvas space-y-1">
                  <span className="text-xs font-medium text-text-tertiary">Payment link status:</span>
                  <p className="text-[11px] text-text-secondary">
                    {result.is_suppressed
                      ? 'No link generated: Customer phone is in DNC suppression list.'
                      : 'Card expired Category 1 hard decline: Automated retries suppressed per ISO 8583 rules.'}
                  </p>
                </div>
              )}

              {/* Statutory Gating Breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                <div className="text-xs font-medium text-text-tertiary">
                  Statutory invariants evaluated by backend:
                </div>
                <div className="space-y-1 text-[11px]">
                  {Object.entries(result.compliance_checks || {}).map(([key, gate]: any) => (
                    <div key={key} className="flex items-center justify-between p-1.5 rounded bg-canvas/60">
                      <span className="text-text-secondary">
                        {gate.passed ? '✓' : '⚠'} {key.replace(/_/g, ' ')}
                      </span>
                      <span className={clsx('font-semibold', gate.passed ? 'text-positive-default' : 'text-attention-default')}>
                        {gate.passed ? 'Passed' : 'Flagged'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hinglish Voicebot FSM Speech Script */}
              {result.voice_script && (
                <div className="p-3 rounded-lg bg-canvas-raised border border-border-subtle space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                    <PhoneCall className="w-3.5 h-3.5 text-attention-default" />
                    <span>Hinglish voicebot FSM generated speech:</span>
                  </div>
                  <p className="text-[11px] text-text-primary italic font-sans">&quot;{result.voice_script}&quot;</p>
                </div>
              )}

              {/* Decisions Trail */}
              <div className="space-y-1 pt-2 border-t border-border-subtle">
                <div className="text-xs font-medium text-text-tertiary">
                  Decisions logged by engine:
                </div>
                <div className="space-y-1 text-[11px]">
                  {result.decisions?.map((d: any, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-canvas/40 border border-border-subtle">
                      <span className="text-brand-default font-medium">{d.action}:</span>{' '}
                      <span className="text-text-secondary">{d.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHA-256 Audit Signature */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                <span>SHA-256 Block #{result.audit_block_index}</span>
                <span className="truncate max-w-[280px] text-text-secondary">{result.audit_block_hash}</span>
                <span className="text-positive-default font-semibold">Sealed in Ledger</span>
              </div>

              {/* View in Queue Button */}
              <div className="pt-2">
                <Link
                  href="/queue"
                  className="w-full py-2.5 rounded-sm surface-panel border border-border-subtle hover:border-border-default text-text-primary text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors shadow-raised-low"
                >
                  <span>View in Transaction Queue Blotter</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-default" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
