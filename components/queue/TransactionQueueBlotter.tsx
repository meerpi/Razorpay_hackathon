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
    <div className="w-full overflow-hidden rounded-md border border-border-subtle surface-panel shadow-raised-low">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header: Pure Trading Desk blotter headers */}
          <thead>
            <tr className="border-b border-border-subtle bg-canvas-overlay/40 text-[11px] font-mono text-text-tertiary select-none">
              <th className="py-2.5 px-3 font-semibold w-20">Time</th>
              <th className="py-2.5 px-3 font-semibold w-36">Ref / Case ID</th>
              <th className="py-2.5 px-3 font-semibold w-32">Customer</th>
              <th className="py-2.5 px-3 font-semibold w-24">Type</th>
              <th className="py-2.5 px-3 font-semibold text-right w-28">Amount</th>
              <th className="py-2.5 px-3 font-semibold min-w-[180px]">Decline Reason &amp; ISO 8583</th>
              <th className="py-2.5 px-3 font-semibold w-24">Rail</th>
              <th className="py-2.5 px-4 font-semibold text-right w-40 min-w-[150px]">Status</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border-subtle">
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
                      'group cursor-pointer transition-colors duration-140',
                      // Row Styling based on State
                      isNeedsReview &&
                        'glass-panel-amber-row hover:bg-attention-subtle text-text-primary',
                      !isNeedsReview && isAutoResolved &&
                        'opacity-85 hover:opacity-100 hover:bg-canvas-overlay',
                      !isNeedsReview && isClosed &&
                        'opacity-60 hover:opacity-80 hover:bg-canvas-overlay text-text-tertiary',
                      !isNeedsReview && !isAutoResolved && !isClosed &&
                        'hover:bg-canvas-overlay text-text-primary',
                      isSelected && 'bg-brand-subtle border-l-2 border-brand-default'
                    )}
                  >
                    {/* Time Column */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                      {c.timeFormatted.split(' ')[0]}
                    </td>

                    {/* Ref / Case ID */}
                    <td className="py-2.5 px-3 font-mono font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isNeedsReview && (
                          <AlertTriangle className="w-3.5 h-3.5 text-attention-default animate-pulse shrink-0" />
                        )}
                        <span className={clsx(isNeedsReview ? 'text-attention-default font-semibold' : 'text-text-primary')}>
                          {c.id.slice(0, 16)}...
                        </span>
                      </div>
                      <div className="text-[10px] text-text-tertiary font-mono truncate">
                        {c.paymentId}
                      </div>
                    </td>

                    {/* Customer Name */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-text-primary truncate max-w-[130px]">
                        {c.customerName}
                      </div>
                      <div className="text-[10px] text-text-tertiary font-mono truncate max-w-[130px]">
                        {c.customerPhone}
                      </div>
                    </td>

                    {/* Case Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-text-secondary px-1.5 py-0.5 rounded-xs bg-canvas-raised border border-border-subtle capitalize">
                        {c.caseType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Amount (₹, mono, tabular-nums, normal weight) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <MonospaceAmount
                        amountRupees={c.amountRupees}
                        size="md"
                        className={clsx(
                          isNeedsReview ? 'text-attention-default font-bold' : 'text-text-primary font-medium'
                        )}
                      />
                    </td>

                    {/* Decline Reason & ISO 8583 */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge declineClass={c.declineClass} size="sm" />
                        <span className="font-mono text-[11px] text-text-secondary truncate max-w-[200px] xl:max-w-xs">
                          {c.errorReason}
                        </span>
                      </div>
                      {c.wasRerouted && (
                        <div className="text-[10px] font-mono text-brand-default truncate mt-0.5">
                          ↳ Failover to {c.rail}
                        </div>
                      )}
                    </td>

                    {/* Rail Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge rail={c.rail} size="sm" />
                    </td>

                    {/* Status Chip */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap min-w-[150px]">
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
