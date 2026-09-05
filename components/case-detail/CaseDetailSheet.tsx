'use client';

import React, { useEffect } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { TransactionCase } from '@/lib/types';
import { MonospaceAmount } from '../ui/MonospaceAmount';
import { StatusBadge } from '../ui/StatusBadge';
import { ReasoningTimeline } from './ReasoningTimeline';

interface CaseDetailSheetProps {
  transactionCase: TransactionCase | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
}

export const CaseDetailSheet: React.FC<CaseDetailSheetProps> = ({
  transactionCase,
  isOpen,
  onClose,
  onActionComplete,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transactionCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Glass Sheet (24px radius, 680px width) */}
      <div className="relative w-full max-w-2xl bg-canvas-raised/95 backdrop-blur-glass border-l border-glass-border shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header Strip */}
        <div className="p-6 border-b border-border-subtle flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-tertiary">{transactionCase.id}</span>
              <StatusBadge status={transactionCase.status} size="sm" />
              <StatusBadge rail={transactionCase.rail} size="sm" />
            </div>

            {/* Headline Amount: Exactly the 28px Display font size */}
            <div className="pt-1">
              <MonospaceAmount amountRupees={transactionCase.amountRupees} size="display" />
            </div>

            <div className="text-xs text-text-secondary flex items-center gap-2 font-mono">
              <span className="font-medium text-text-primary">{transactionCase.customerName}</span>
              <span>·</span>
              <span>{transactionCase.customerPhone}</span>
              <span>·</span>
              <span>{transactionCase.timeFormatted}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xs text-text-tertiary hover:text-text-primary hover:bg-canvas-overlay transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Scrollable 7-Stage Reasoning Trail */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Micro-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xs bg-canvas/60 border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Payment Ref</div>
              <div className="font-semibold text-text-primary truncate">{transactionCase.paymentId}</div>
            </div>
            <div className="p-2 rounded-xs bg-canvas/60 border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Order Ref</div>
              <div className="font-semibold text-text-primary truncate">{transactionCase.orderId}</div>
            </div>
            <div className="p-2 rounded-xs bg-canvas/60 border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Case Type</div>
              <div className="font-semibold text-text-primary capitalize">{transactionCase.caseType.replace(/_/g, ' ')}</div>
            </div>
            <div className="p-2 rounded-xs bg-canvas/60 border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Method</div>
              <div className="font-semibold text-brand-default capitalize">
                {transactionCase.method === 'upi' ? 'UPI' : transactionCase.method}
              </div>
            </div>
          </div>

          {/* Reasoning Timeline (7 Stages + Inline HITL Card) */}
          <ReasoningTimeline
            transactionCase={transactionCase}
            onActionComplete={onActionComplete}
          />
        </div>

        {/* Footer Audit Signature Bar */}
        <div className="p-4 border-t border-border-subtle bg-canvas/60 flex items-center justify-between text-[11px] font-mono text-text-tertiary">
          <span>SHA-256 Block #{transactionCase.auditBlockIndex}</span>
          <span className="truncate max-w-[320px] text-text-secondary">
            {transactionCase.auditBlockHash}
          </span>
          <span className="text-positive-default flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Immutable</span>
          </span>
        </div>
      </div>
    </div>
  );
};
