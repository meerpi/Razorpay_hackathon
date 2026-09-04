'use client';

import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { TransactionCase } from '@/lib/types';
import { MonospaceAmount } from '../ui/MonospaceAmount';
import { StatusBadge } from '../ui/StatusBadge';

interface TransactionQueueBlotterProps {
  cases: TransactionCase[];
  onSelectCase: (c: TransactionCase) => void;
  selectedCaseId?: string;
}

export const TransactionQueueBlotter: React.FC<TransactionQueueBlotterProps> = ({
  cases,
  onSelectCase,
  selectedCaseId,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-glass-border glass-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header: Pure Trading Desk blotter headers */}
          <thead>
            <tr className="border-b border-glass-border bg-canvas-raised/80 text-[11px] font-mono uppercase tracking-wider text-text-tertiary select-none">
              <th className="py-3 px-4 font-semibold w-24">Time</th>
              <th className="py-3 px-4 font-semibold w-40">Ref / Case ID</th>
              <th className="py-3 px-4 font-semibold w-36">Customer</th>
              <th className="py-3 px-4 font-semibold w-32">Type</th>
              <th className="py-3 px-4 font-semibold text-right w-36">Amount</th>
              <th className="py-3 px-4 font-semibold">Decline Reason &amp; ISO 8583</th>
              <th className="py-3 px-4 font-semibold w-28">Rail</th>
              <th className="py-3 px-4 font-semibold text-right w-36">Status</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-glass-border">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-tertiary font-mono">
                  No transaction events matching selected filter.
                </td>
              </tr>
            ) : (
              cases.map((c) => {
                const isSelected = selectedCaseId === c.id;
                const isNeedsReview = c.status === 'needs_review';
                const isAutoResolved = c.status === 'auto_resolved';
                const isClosed = c.status === 'closed';

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className={clsx(
                      'group cursor-pointer transition-all duration-150',
                      // Row Styling based on State
                      isNeedsReview &&
                        'glass-panel-amber-row hover:bg-human-amber/10 text-text-primary',
                      !isNeedsReview && isAutoResolved &&
                        'opacity-80 hover:opacity-100 hover:bg-glass-bg',
                      !isNeedsReview && isClosed &&
                        'opacity-60 hover:opacity-80 hover:bg-glass-bg text-text-tertiary',
                      !isNeedsReview && !isAutoResolved && !isClosed &&
                        'hover:bg-glass-bg text-text-primary',
                      isSelected && 'bg-brand-blue/10 border-l-2 border-brand-blue'
                    )}
                  >
                    {/* Time Column */}
                    <td className="py-3 px-4 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                      {c.timeFormatted.split(' ')[0]}
                    </td>

                    {/* Ref / Case ID */}
                    <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isNeedsReview && (
                          <AlertTriangle className="w-3.5 h-3.5 text-human-amber animate-pulse shrink-0" />
                        )}
                        <span className={clsx(isNeedsReview ? 'text-human-amber font-semibold' : 'text-text-primary')}>
                          {c.id.slice(0, 16)}...
                        </span>
                      </div>
                      <div className="text-[10px] text-text-tertiary font-mono truncate">
                        {c.paymentId}
                      </div>
                    </td>

                    {/* Customer Name */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-text-primary truncate max-w-[140px]">
                        {c.customerName}
                      </div>
                      <div className="text-[10px] text-text-tertiary font-mono truncate max-w-[140px]">
                        {c.customerPhone}
                      </div>
                    </td>

                    {/* Case Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono uppercase text-text-secondary px-1.5 py-0.5 rounded bg-canvas-raised border border-glass-border">
                        {c.caseType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Amount (₹, mono, tabular-nums, normal weight) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <MonospaceAmount
                        amountRupees={c.amountRupees}
                        size="md"
                        className={clsx(
                          isNeedsReview ? 'text-human-amber font-bold' : 'text-text-primary font-medium'
                        )}
                      />
                    </td>

                    {/* Decline Reason & ISO 8583 */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge declineClass={c.declineClass} size="sm" />
                        <span className="font-mono text-xs text-text-secondary truncate max-w-[220px]">
                          {c.errorReason}
                        </span>
                      </div>
                      {c.wasRerouted && (
                        <div className="text-[10px] font-mono text-brand-blue truncate mt-0.5">
                          ↳ Failover to {c.rail}
                        </div>
                      )}
                    </td>

                    {/* Rail Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge rail={c.rail} size="sm" />
                    </td>

                    {/* Status Chip */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <StatusBadge status={c.status} size="sm" />
                        <ArrowRight className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
