'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  MessageSquare,
} from 'lucide-react';
import { TransactionCase } from '@/lib/types';
import { MonospaceAmount } from '../ui/MonospaceAmount';
import { dataStore } from '@/lib/mock-data';

interface HumanDecisionCardProps {
  currentCase: TransactionCase;
  onActionComplete?: () => void;
}

export const HumanDecisionCard: React.FC<HumanDecisionCardProps> = ({
  currentCase,
  onActionComplete,
}) => {
  const [operatorNote, setOperatorNote] = useState<string>('');
  const [selectedOverride, setSelectedOverride] = useState<string>(
    'Reroute to UPI Intent (PhonePe/GPay/Paytm) with ₹50 discount incentive'
  );
  const [activeTab, setActiveTab] = useState<'decision' | 'override'>('decision');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an operator rationale note before approving.');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch('/api/engine/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          action: 'approve',
          note: operatorNote,
        }),
      });
    } catch (e) {
      console.error('Failed to persist case approval:', e);
    }
    dataStore.approveCase(currentCase.id, operatorNote);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleOverride = async () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an operator rationale note before applying override.');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch('/api/engine/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          action: 'override',
          overrideAction: selectedOverride,
          note: operatorNote,
        }),
      });
    } catch (e) {
      console.error('Failed to persist case override:', e);
    }
    dataStore.overrideCase(currentCase.id, selectedOverride, operatorNote);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleReject = async () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an escalation note for the Grievance Redressal Officer.');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch('/api/engine/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          action: 'reject',
          note: operatorNote,
        }),
      });
    } catch (e) {
      console.error('Failed to persist case rejection:', e);
    }
    dataStore.rejectCase(currentCase.id, operatorNote);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const overrideOptions = [
    'Reroute to UPI Intent (PhonePe/GPay/Paytm) with ₹50 discount incentive',
    'Generate Instant WhatsApp Razorpay Smart PayLink (1-Click Checkout)',
    'Schedule voicebot callback in next daylight window (08:00–19:00 IST)',
    'Defer outreach to customer modal payday (Day 1)',
    'Escalate to Corporate Accounts Receivable Specialist',
  ];

  return (
    <div className="glass-panel-amber rounded-md p-5 my-4 transition-all">
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-attention-muted">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xs bg-attention-subtle flex items-center justify-center text-attention-default border border-attention-muted">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono text-attention-default font-semibold">
              Human-in-the-Loop Intercept
            </div>
            <div className="text-[11px] text-text-tertiary">
              Autonomous remediation halted by regulatory/policy sentinel
            </div>
          </div>
        </div>

        {/* SLA Countdown Timer */}
        {currentCase.slaCountdownSeconds && (
          <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-xs bg-canvas-raised border border-attention-muted text-attention-default font-semibold tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>SLA: 23h 48m</span>
          </div>
        )}
      </div>

      {/* Structured Intercept Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
        {/* Escalation Reason */}
        <div className="col-span-full">
          <div className="text-[11px] font-mono text-text-tertiary mb-1">
            Escalation Reason:
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-attention-subtle text-attention-default border border-attention-muted font-mono text-xs font-medium">
            {currentCase.escalationReason || 'Policy Sentinel Intercept'}
          </div>
        </div>

        {/* Financial Exposure */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary mb-1">
            Financial Exposure:
          </div>
          <div className="text-sm font-mono font-semibold text-text-primary">
            <MonospaceAmount amountRupees={currentCase.financialExposure || currentCase.amountRupees} size="md" />
          </div>
        </div>

        {/* Regulatory Citation */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary mb-1">
            Regulatory Citation:
          </div>
          <div className="text-xs text-text-secondary font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-default" />
            <span>{currentCase.regulatoryCitation || 'RBI Fair Practices Code §3.1'}</span>
          </div>
        </div>

        {/* Agent Confidence */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary mb-1">
            Agent Confidence:
          </div>
          <div className="text-xs font-mono font-semibold text-text-secondary flex items-center gap-2">
            <span className="text-positive-default">{(currentCase.agentConfidence * 100).toFixed(1)}%</span>
            <span className="text-[10px] text-text-tertiary font-normal">(Threshold: 80.0%)</span>
          </div>
        </div>

        {/* Agent Suggested Action */}
        <div className="col-span-full">
          <div className="text-[11px] font-mono text-text-tertiary mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-brand-default" />
            <span>Agent Proposed Resolution:</span>
          </div>
          <div className="p-2.5 rounded-xs bg-canvas/60 border border-border-subtle text-xs text-text-primary leading-relaxed font-sans">
            {currentCase.agentSuggestedAction || 'Dispatch compliant Smart PayLink with pre-debit AFA notification.'}
          </div>
        </div>
      </div>

      {/* Customer Message Preview with AI Disclosure tag */}
      <div className="p-2.5 rounded-xs bg-canvas/40 border border-border-subtle text-xs mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-text-tertiary font-mono text-[11px]">
            <MessageSquare className="w-3 h-3" />
            <span>Customer Message Preview</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-brand-navy border border-brand-muted text-brand-default">
            AI-generated — will be disclosed to customer
          </span>
        </div>
        <p className="text-[11px] text-text-secondary italic font-mono">
          &quot;Namaste {currentCase.customerName} ji, aapke account se ₹
          {currentCase.amountRupees.toLocaleString('en-IN')} ka autopay limit ke kaaran complete nahi ho paya.
          Ek click me OTP verify karke complete karein: {currentCase.dispatch.paylinkUrl || 'https://rzp.io/l/...'}&quot;
        </p>
      </div>

      {/* Tab Switcher for Action vs Manual Override */}
      <div className="flex items-center gap-2 mb-3 border-b border-border-subtle pb-2">
        <button
          onClick={() => setActiveTab('decision')}
          className={clsx(
            'px-3 py-1 rounded-xs text-xs font-mono transition-colors cursor-pointer',
            activeTab === 'decision'
              ? 'bg-attention-subtle text-attention-default border border-attention-muted font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Direct Actions
        </button>
        <button
          onClick={() => setActiveTab('override')}
          className={clsx(
            'px-3 py-1 rounded-xs text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer',
            activeTab === 'override'
              ? 'bg-brand-subtle text-brand-default border border-brand-muted font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <RefreshCw className="w-3 h-3" />
          <span>Select Manual Override</span>
        </button>
      </div>

      {/* Override Dropdown if Tab is active */}
      {activeTab === 'override' && (
        <div className="mb-3 space-y-1.5">
          <label className="text-[11px] font-mono text-text-tertiary">
            Choose Alternative Remediation Rail:
          </label>
          <select
            value={selectedOverride}
            onChange={(e) => setSelectedOverride(e.target.value)}
            className="w-full bg-canvas border border-border-subtle rounded-xs px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-default font-mono"
          >
            {overrideOptions.map((opt, idx) => (
              <option key={idx} value={opt} className="bg-canvas-raised text-text-primary">
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Operator Note Input (Required for Cryptographic Audit) */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-text-tertiary">
            Operator Note <span className="text-negative-default">*</span> (Recorded to SHA-256 Ledger):
          </span>
          <span className="text-text-tertiary">{operatorNote.length}/250</span>
        </div>
        <textarea
          value={operatorNote}
          onChange={(e) => {
            setOperatorNote(e.target.value);
            if (feedbackMessage) setFeedbackMessage(null);
          }}
          placeholder="Document operator justification and verification details..."
          rows={2}
          className="w-full bg-canvas/80 border border-border-subtle rounded-xs p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-attention-default font-sans resize-none"
        />
        {feedbackMessage && (
          <p className="text-[11px] text-negative-default font-mono flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>{feedbackMessage}</span>
          </p>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="px-3.5 py-1.5 rounded-xs text-xs font-mono font-medium text-negative-default hover:bg-negative-subtle border border-negative-muted transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Reject &amp; Escalate to GRO</span>
        </button>

        {activeTab === 'override' ? (
          <button
            onClick={handleOverride}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xs text-xs font-mono font-medium bg-brand-default text-white hover:bg-brand-emphasis border border-brand-emphasis transition-all flex items-center gap-1.5 cursor-pointer shadow-raised-low"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Apply Override &amp; Dispatch</span>
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xs text-xs font-mono font-semibold bg-attention-default text-canvas hover:bg-attention-emphasis transition-all flex items-center gap-1.5 cursor-pointer shadow-raised-low"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve &amp; Resume Autonomous Remediation</span>
          </button>
        )}
      </div>
    </div>
  );
};
