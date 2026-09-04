'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  UserX,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { TransactionCase } from '@/lib/types';
import { ClockDial24H } from '@/components/compliance/ClockDial24H';
import { CaseDetailSheet } from '@/components/case-detail/CaseDetailSheet';
import { MonospaceAmount } from '@/components/ui/MonospaceAmount';

export default function CompliancePage() {
  const [cases, setCases] = useState<TransactionCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TransactionCase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setCases([...dataStore.getCases()]);
    };
    update();
    const unsub = dataStore.subscribe(update);
    return () => unsub();
  }, []);

  const handleOpenCase = (c: TransactionCase) => {
    setSelectedCase(c);
    setIsSheetOpen(true);
  };

  // 1. Pending e-mandate debits flagged at ₹15,000 AFA
  const afaFlaggedCases = cases.filter(
    (c) => c.caseType === 'mandate' || c.amountRupees > 15000
  );

  // 2. B2B Receivables Section 43B(h) cases
  const b2bCases = cases.filter((c) => c.caseType === 'b2b_receivable');

  // 3. Mock DNC / Opt-Out Suppressed list
  const dncSuppressedList = [
    { phone: '+91 97665 12044', reason: 'Customer requested human / DNC opted out', date: '2026-09-04 14:21 IST' },
    { phone: '+91 98110 99887', reason: 'SMS DLT Opt-out reply (STOP)', date: '2026-09-03 16:40 IST' },
    { phone: '+91 99201 33445', reason: 'TRAI TCCCPR Registry match', date: '2026-09-02 11:15 IST' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-success-teal" />
            <span>Compliance &amp; Statutory Gating</span>
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-1">
            Reference panel: Hard-coded regulatory gates enforcing RBI, TRAI, and MSMED statutory rules
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-tertiary">
          Breaches Detected: <span className="text-success-teal font-bold">0</span> (100% Compliant)
        </div>
      </div>

      {/* Top Row: 24h Dial + TRAI DLT Sentinel + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Circular 24-Hour Dial */}
        <div className="lg:col-span-1">
          <ClockDial24H />
        </div>

        {/* TRAI 1601 Header Sentinel & Legal Citations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl glass-panel space-y-3">
            <div className="flex items-center justify-between border-b border-glass-border pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold">
                  TRAI TCCCPR 1601 Series Header Enforcement
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success-teal/20 text-success-teal border border-success-teal/40 font-semibold uppercase">
                Enforced
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              All telephony voicebot outbounds originate exclusively from TRAI-mandated{' '}
              <span className="font-mono text-text-primary font-semibold">1601 series</span> headers.
              Outreach strictly discloses entity identity before revealing transaction debt details, satisfying
              RBI Fair Practices Code (FPC) §3.1 Right-Party Verification requirements.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-canvas/60 border border-glass-border">
                <span className="text-text-tertiary block text-[10px]">Active Header</span>
                <span className="text-brand-blue font-semibold">+91 1601 294 819</span>
              </div>
              <div className="p-2 rounded bg-canvas/60 border border-glass-border">
                <span className="text-text-tertiary block text-[10px]">DLT Entity ID</span>
                <span className="text-text-primary font-semibold">1101529840001</span>
              </div>
              <div className="p-2 rounded bg-canvas/60 border border-glass-border">
                <span className="text-text-tertiary block text-[10px]">DNC Suppression</span>
                <span className="text-human-amber font-semibold">{dncSuppressedList.length} Contacts Active</span>
              </div>
            </div>
          </div>

          {/* DNC Suppression Quick List */}
          <div className="p-4 rounded-xl glass-panel space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-human-amber" />
                <span>Do-Not-Call (DNC) &amp; Opt-Out Registry (Zero Outreach Guarantee)</span>
              </div>
            </div>

            <div className="divide-y divide-glass-border font-mono text-xs">
              {dncSuppressedList.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-[11px]">
                  <span className="text-text-primary font-semibold">{item.phone}</span>
                  <span className="text-text-secondary truncate max-w-[280px]">{item.reason}</span>
                  <span className="text-text-tertiary">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Flagged e-Mandates Above ₹15,000 AFA Limit */}
      <div className="p-5 rounded-xl glass-panel space-y-3">
        <div className="flex items-center justify-between border-b border-glass-border pb-3">
          <div>
            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-human-amber" />
              <span>e-Mandate AFA Sentinel (Transactions &gt; ₹15,000 Ceiling)</span>
            </div>
            <div className="text-xs font-mono text-text-tertiary mt-0.5">
              RBI Circular: Digital Payments E-Mandate Framework 2026 §4.2 (Explicit Customer 2FA Required)
            </div>
          </div>

          <span className="font-mono text-xs text-text-tertiary">
            {afaFlaggedCases.length} Flagged Case{afaFlaggedCases.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-glass-border text-[10px] uppercase tracking-wider text-text-tertiary">
                <th className="py-2 px-3">Case ID</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3">Threshold Status</th>
                <th className="py-2 px-3">Remediation</th>
                <th className="py-2 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {afaFlaggedCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleOpenCase(c)}
                  className="hover:bg-glass-bg cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-brand-blue font-semibold">{c.id.slice(0, 16)}...</td>
                  <td className="py-2.5 px-3 text-text-primary font-sans">{c.customerName}</td>
                  <td className="py-2.5 px-3 text-right">
                    <MonospaceAmount amountRupees={c.amountRupees} size="sm" />
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-human-amber/15 text-human-amber border border-human-amber/30">
                      ₹{c.amountRupees.toLocaleString('en-IN')} &gt; ₹15,000 Ceiling
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary">
                    {c.dispatch.paylinkUrl ? 'Smart PayLink with AFA OTP' : 'Awaiting Operator Approval'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-brand-blue">
                    <ExternalLink className="w-3.5 h-3.5 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: B2B Section 43B(h) Countdown Board */}
      <div className="p-5 rounded-xl glass-panel space-y-3">
        <div className="flex items-center justify-between border-b border-glass-border pb-3">
          <div>
            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-blue" />
              <span>MSMED Act §43B(h) Statutory 45-Day Countdown Board</span>
            </div>
            <div className="text-xs font-mono text-text-tertiary mt-0.5">
              Finance Act 2023: Unpaid dues to MSMEs beyond 45 days disallowed from tax deductions
            </div>
          </div>

          <span className="font-mono text-xs text-text-tertiary">
            {b2bCases.length} B2B Invoice{b2bCases.length === 1 ? '' : 's'} Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {b2bCases.map((b) => {
            const isNearDeadline = b.b2bAgingBucket === '31_60_days';
            const daysLeft = isNearDeadline ? 2 : 33;

            return (
              <div
                key={b.id}
                onClick={() => handleOpenCase(b)}
                className={clsx(
                  'p-4 rounded-lg border cursor-pointer transition-all',
                  isNearDeadline
                    ? 'bg-human-amber/10 border-human-amber/40 hover:bg-human-amber/15 shadow-[0_0_12px_var(--human-amber-glow)]'
                    : 'bg-canvas-raised/60 border-glass-border hover:bg-glass-bg'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-text-primary font-sans text-xs">
                      {b.b2bCompanyName || 'Enterprise Accounts Receivable'}
                    </div>
                    <div className="font-mono text-[11px] text-text-tertiary mt-0.5">
                      {b.b2bInvoiceId || b.orderId}
                    </div>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div
                    className={clsx(
                      'font-mono text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider',
                      daysLeft <= 3
                        ? 'bg-danger-crimson/20 text-danger-crimson border border-danger-crimson/40 animate-pulse'
                        : daysLeft <= 15
                        ? 'bg-human-amber/20 text-human-amber border border-human-amber/40'
                        : 'bg-success-teal/20 text-success-teal border border-success-teal/40'
                    )}
                  >
                    {daysLeft <= 3 ? `CRITICAL: ${daysLeft} DAYS LEFT` : `${daysLeft} Days to Disallowance`}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-glass-border text-xs font-mono">
                  <span className="text-text-secondary">Outstanding Amount:</span>
                  <MonospaceAmount amountRupees={b.amountRupees} size="md" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Case Detail Sheet */}
      <CaseDetailSheet
        transactionCase={selectedCase}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
