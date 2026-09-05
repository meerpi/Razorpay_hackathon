'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Layers, ShieldCheck, Clock, ArrowRight, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

import { RecoverySummaryData } from '@/lib/types';

interface BreakdownModuleProps {
  summary?: RecoverySummaryData | null;
}

export const BreakdownModule: React.FC<BreakdownModuleProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'rail' | 'severity' | 'msme'>('rail');

  const totalCases = summary?.total_cases ?? 1500;
  const byType = summary?.by_case_type;
  const byClass = summary?.by_decline_class;

  const productRails = [
    {
      type: 'payment',
      label: 'Payment Gateway',
      total: byType?.payment?.total ?? 450,
      recovered: byType?.payment?.recovered ?? 210,
      rate: byType?.payment ? (byType.payment.rate * 100).toFixed(1) : '46.7',
    },
    {
      type: 'subscription',
      label: 'Recurring Subscription',
      total: byType?.subscription?.total ?? 375,
      recovered: byType?.subscription?.recovered ?? 172,
      rate: byType?.subscription ? (byType.subscription.rate * 100).toFixed(1) : '45.9',
    },
    {
      type: 'mandate',
      label: 'NPCI E-Mandate',
      total: byType?.mandate?.total ?? 300,
      recovered: byType?.mandate?.recovered ?? 140,
      rate: byType?.mandate ? (byType.mandate.rate * 100).toFixed(1) : '46.7',
    },
    {
      type: 'b2b_receivable',
      label: 'B2B MSME Invoices',
      total: byType?.b2b_receivable?.total ?? 150,
      recovered: byType?.b2b_receivable?.recovered ?? 107,
      rate: byType?.b2b_receivable ? (byType.b2b_receivable.rate * 100).toFixed(1) : '71.3',
    },
    {
      type: 'checkout_drop_off',
      label: 'Checkout Drop-off',
      total: byType?.checkout_drop_off?.total ?? 225,
      recovered: byType?.checkout_drop_off?.recovered ?? 45,
      rate: byType?.checkout_drop_off ? (byType.checkout_drop_off.rate * 100).toFixed(1) : '20.0',
    },
  ];

  const hardTotal = byClass?.hard?.total ?? 212;
  const softTotal = byClass?.soft?.total ?? 1039;
  const softRec = byClass?.soft?.recovered ?? 501;
  const softRate = byClass?.soft ? (byClass.soft.rate * 100).toFixed(1) : '48.2';
  const techTotal = byClass?.technical?.total ?? 249;
  const techRec = byClass?.technical?.recovered ?? 173;
  const techRate = byClass?.technical ? (byClass.technical.rate * 100).toFixed(1) : '69.5';

  const tabs = [
    { id: 'rail', label: 'By Product Rail', icon: Layers },
    { id: 'severity', label: 'Decline Class & Stopping Rules', icon: ShieldCheck },
    { id: 'msme', label: 'Section 43B(h) MSME Aging', icon: Clock },
  ] as const;

  return (
    <GlassCard variant="surface" padding="none" className="overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-subtle bg-canvas-overlay/40 px-5 pt-3">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] cursor-pointer',
                  isActive
                    ? 'border-brand-default text-brand-default font-semibold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-text-tertiary py-2 sm:py-0">
          Click any row to filter transaction queue
        </span>
      </div>

      {/* Tab Content Body */}
      <div className="p-5">
        {activeTab === 'rail' && (
          <div className="space-y-2">
            <div className="text-xs text-text-secondary mb-3 flex items-center justify-between">
              <span>5 core product lines processed through autonomous policy routing:</span>
              <span className="font-mono text-[11px] text-text-tertiary">N = {totalCases.toLocaleString()} cases</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {productRails.map((item) => (
                <Link
                  key={item.type}
                  href={`/queue?type=${item.type}`}
                  className="group block p-3 rounded-md border border-border-subtle bg-canvas/40 hover:border-border-default hover:bg-canvas-raised transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-primary font-medium group-hover:text-brand-default transition-colors">
                      {item.label}
                    </span>
                    <span className="text-brand-default font-mono font-semibold tabular-nums">
                      {item.rate}% ({item.recovered}/{item.total})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-canvas-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-default rounded-full transition-all"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'severity' && (
          <div className="space-y-3">
            <div className="text-xs text-text-secondary mb-2">
              Hard-stop invariants preventing scheme penalties vs. empirical Bayesian retry loops:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Hard Decline */}
              <Link
                href="/queue?class=hard"
                className="group block p-3.5 rounded-md border border-negative-muted bg-negative-subtle hover:bg-negative-subtle/80 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-negative-default font-semibold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Hard Decline (Cat 1)
                  </span>
                  <span className="text-negative-default font-semibold">0% (0 Retries)</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Card expired/stolen. Zero-retry stopping rule saved <strong className="text-text-primary">₹88,200</strong> in card scheme fines across {hardTotal.toLocaleString()} cases.
                </p>
              </Link>

              {/* Soft Decline */}
              <Link
                href="/queue?class=soft"
                className="group block p-3.5 rounded-md border border-border-subtle bg-canvas/40 hover:border-border-default hover:bg-canvas-raised transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-text-primary font-medium">Soft Decline (Cat 2)</span>
                  <span className="text-brand-default font-semibold tabular-nums">{softRate}% ({softRec.toLocaleString()} / {softTotal.toLocaleString()})</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Insufficient funds retried via empirical Bayesian liquidity timing synchronized with customer salary cycles.
                </p>
              </Link>

              {/* Technical Error */}
              <Link
                href="/queue?class=technical"
                className="group block p-3.5 rounded-md border border-border-subtle bg-canvas/40 hover:border-border-default hover:bg-canvas-raised transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-text-primary font-medium">Technical Gateway Error</span>
                  <span className="text-positive-default font-semibold tabular-nums">{techRate}% ({techRec.toLocaleString()} / {techTotal.toLocaleString()})</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Bank switch timeout failover dynamically routed to healthy UPI Intent rails within 940ms.
                </p>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'msme' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Section 43B(h) Income Tax Act statutory 45-day deadline tracking for B2B MSME dues:</span>
              <span className="font-mono text-[11px] text-text-tertiary">MSMED Act 2006</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {[
                { bucket: 'current', label: 'Current (0–15d)', rate: 97.9, cases: '46/47', status: 'Compliant' },
                { bucket: '1_15_days', label: '1–15 Days Overdue', rate: 84.8, cases: '39/46', status: 'Active' },
                { bucket: '16_30_days', label: '16–30 Days Overdue', rate: 45.5, cases: '15/33', status: 'Urgent' },
                { bucket: '31_60_days', label: '31–60 Days (Breach)', rate: 42.9, cases: '6/14', status: 'Critical' },
                { bucket: '60_plus_days', label: '60+ Days (Written Off)', rate: 10.0, cases: '1/10', status: 'Disallowed' },
              ].map((item) => (
                <Link
                  key={item.bucket}
                  href="/queue?type=b2b_receivable"
                  className="group block p-2.5 rounded-md border border-border-subtle bg-canvas/40 hover:border-border-default hover:bg-canvas-raised transition-all"
                >
                  <div className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary">
                    {item.label}
                  </div>
                  <div className="text-sm font-mono font-bold text-text-primary mt-1 tabular-nums">
                    {item.rate}%
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary flex items-center justify-between mt-1">
                    <span>{item.cases}</span>
                    <span className="text-text-secondary">{item.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
