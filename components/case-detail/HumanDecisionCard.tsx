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

  const handleApprove = () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an operator rationale note before approving.');
      return;
    }
    setIsSubmitting(true);
    dataStore.approveCase(currentCase.id, operatorNote);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleOverride = () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an operator rationale note before applying override.');
      return;
    }
    setIsSubmitting(true);
    dataStore.overrideCase(currentCase.id, selectedOverride, operatorNote);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleReject = () => {
    if (!operatorNote.trim()) {
      setFeedbackMessage('Please enter an escalation note for the Grievance Redressal Officer.');
      return;
    }
    setIsSubmitting(true);
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
    <div className="glass-panel-amber rounded-xl p-5 my-4 transition-all">
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-human-amber/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-human-amber/20 flex items-center justify-center text-human-amber border border-human-amber/40">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-human-amber font-semibold">
              Human-in-the-Loop Intercept
            </div>
            <div className="text-[11px] text-text-tertiary">
              Autonomous remediation halted by regulatory/policy sentinel
            </div>
          </div>
        </div>

        {/* SLA Countdown Timer */}
        {currentCase.slaCountdownSeconds && (
          <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded bg-canvas-raised/90 border border-human-amber/30 text-human-amber font-semibold tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>SLA: 23h 48m</span>
          </div>
        )}
      </div>

      {/* Structured Intercept Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
        {/* Escalation Reason */}
        <div className="col-span-full">
          <div className="text-[11px] font-mono text-text-tertiary uppercase mb-1">
            Escalation Reason:
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-human-amber/15 text-human-amber border border-human-amber/30 font-mono text-xs font-medium">
            {currentCase.escalationReason || 'Policy Sentinel Intercept'}
          </div>
        </div>

        {/* Financial Exposure */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary uppercase mb-1">
            Financial Exposure:
          </div>
          <div className="text-sm font-mono font-semibold text-text-primary">
            <MonospaceAmount amountRupees={currentCase.financialExposure || currentCase.amountRupees} size="md" />
          </div>
        </div>

        {/* Regulatory Citation */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary uppercase mb-1">
            Regulatory Citation:
          </div>
          <div className="text-xs text-text-secondary font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
            <span>{currentCase.regulatoryCitation || 'RBI Fair Practices Code §3.1'}</span>
          </div>
        </div>

        {/* Agent Confidence */}
        <div>
          <div className="text-[11px] font-mono text-text-tertiary uppercase mb-1">
            Agent Confidence:
          </div>
          <div className="text-xs font-mono font-semibold text-text-secondary flex items-center gap-2">
            <span className="text-success-teal">{(currentCase.agentConfidence * 100).toFixed(1)}%</span>
            <span className="text-[10px] text-text-tertiary font-normal">(Threshold: 80.0%)</span>
          </div>
        </div>

        {/* Agent Suggested Action */}
        <div className="col-span-full">
          <div className="text-[11px] font-mono text-text-tertiary uppercase mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-brand-blue" />
            <span>Agent Proposed Resolution:</span>
          </div>
          <div className="p-2.5 rounded bg-canvas/60 border border-glass-border text-xs text-text-primary leading-relaxed font-sans">
            {currentCase.agentSuggestedAction || 'Dispatch compliant Smart PayLink with pre-debit AFA notification.'}
          </div>
        </div>
      </div>

      {/* Customer Message Preview with AI Disclosure tag */}
      <div className="p-2.5 rounded bg-canvas/40 border border-glass-border/70 text-xs mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-text-tertiary font-mono text-[11px]">
            <MessageSquare className="w-3 h-3" />
            <span>Customer Message Preview</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-navy border border-brand-blue/30 text-brand-blue uppercase tracking-wider">
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
      <div className="flex items-center gap-2 mb-3 border-b border-glass-border pb-2">
        <button
          onClick={() => setActiveTab('decision')}
          className={clsx(
            'px-3 py-1 rounded text-xs font-mono transition-colors',
            activeTab === 'decision'
              ? 'bg-human-amber/20 text-human-amber border border-human-amber/40 font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Direct Actions
        </button>
        <button
          onClick={() => setActiveTab('override')}
          className={clsx(
            'px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5',
            activeTab === 'override'
              ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40 font-semibold'
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
          <label className="text-[11px] font-mono text-text-tertiary uppercase">
            Choose Alternative Remediation Rail:
          </label>
          <select
            value={selectedOverride}
            onChange={(e) => setSelectedOverride(e.target.value)}
            className="w-full bg-canvas border border-glass-border rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-blue font-mono"
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
          <span className="text-text-tertiary uppercase">
            Operator Note <span className="text-danger-crimson">*</span> (Recorded to SHA-256 Ledger):
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
          className="w-full bg-canvas/80 border border-glass-border rounded-md p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-human-amber/60 font-sans resize-none"
        />
        {feedbackMessage && (
          <p className="text-[11px] text-danger-crimson font-mono flex items-center gap-1">
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
          className="px-3.5 py-2 rounded-md text-xs font-mono font-medium text-danger-crimson hover:bg-danger-crimson/15 border border-danger-crimson/30 transition-all flex items-center gap-1.5"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Reject &amp; Escalate to GRO</span>
        </button>

        {activeTab === 'override' ? (
          <button
            onClick={handleOverride}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-xs font-mono font-medium bg-brand-blue text-white hover:bg-brand-blue/90 shadow-blue-glow transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Apply Override &amp; Dispatch</span>
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-xs font-mono font-semibold bg-human-amber text-canvas hover:bg-human-amber/90 shadow-[0_0_12px_var(--human-amber-glow)] transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve &amp; Resume Autonomous Remediation</span>
          </button>
        )}
      </div>
    </div>
  );
};
