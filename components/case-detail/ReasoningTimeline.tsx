'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileCheck,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { TransactionCase } from '@/lib/types';
import { HumanDecisionCard } from './HumanDecisionCard';
import { MonospaceAmount } from '../ui/MonospaceAmount';

interface ReasoningTimelineProps {
  transactionCase: TransactionCase;
  onActionComplete?: () => void;
}

export const ReasoningTimeline: React.FC<ReasoningTimelineProps> = ({
  transactionCase,
  onActionComplete,
}) => {
  const {
    id,
    timestamp,
    timeFormatted,
    errorReason,
    errorCode,
    errorDescription,
    declineClass,
    isoCode,
    isoCategory,
    agentConfidence,
    complianceChecks,
    bayesianTiming,
    dispatch,
    outcome,
    rail,
    wasRerouted,
    rerouteReason,
    needsReview,
    operatorDecision,
  } = transactionCase;

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[1px] before:bg-border-subtle">
      {/* ── STAGE 1: INTERCEPTED ────────────────────────────────────────── */}
      <div className="relative group">
        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-default font-semibold">
            1. Intercepted
          </span>
          <span className="text-[11px] font-mono text-text-tertiary">{timeFormatted}</span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Gateway Error Event:</span>
            <span className="font-mono text-text-primary px-1.5 py-0.5 rounded-xs bg-canvas font-medium">
              {errorCode}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Decline Code:</span>
            <span className="font-mono text-negative-default font-semibold">{errorReason}</span>
          </div>
          <p className="text-text-tertiary text-[11px] pt-1 border-t border-border-subtle">
            &quot;{errorDescription}&quot;
          </p>
        </div>
      </div>

      {/* ── STAGE 2: CLASSIFIED & ROOT-CAUSE LAYER ───────────────────────── */}
      <div className="relative group">
        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-default font-semibold">
            2. Classified &amp; Root Cause
          </span>
          <span className="text-[11px] font-mono text-positive-default">
            Confidence: {(agentConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">ISO 8583 Categorization:</span>
            <span
              className={clsx(
                'font-mono px-2 py-0.5 rounded-xs text-[11px] font-semibold',
                isoCategory === 1
                  ? 'bg-negative-subtle text-negative-default border border-negative-muted'
                  : 'bg-brand-subtle text-brand-default border border-brand-muted'
              )}
            >
              ISO Code {isoCode} · Category {isoCategory} (
              {isoCategory === 1 ? 'Hard Decline' : 'Wait & Retry'})
            </span>
          </div>

          <div className="text-[11px] text-text-secondary leading-relaxed bg-canvas/60 p-2 rounded-xs border border-border-subtle">
            {declineClass === 'hard' ? (
              <span className="text-negative-default font-mono">
                Category 1 Hard Decline enforced: Zero automated card retries permitted. Avoided Visa/Mastercard
                excess authorization penalty (~₹42.00).
              </span>
            ) : (
              <span className="text-text-secondary">
                Soft/technical issue classified. Retries allowed under contextual Bayesian liquidity timing schedule.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── STAGE 3: STATUTORY COMPLIANCE GATING ────────────────────────── */}
      <div className="relative group">
        <span
          className={clsx(
            'absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2',
            complianceChecks.emandateAfa.passed && complianceChecks.msmed43Bh.passed
              ? 'border-positive-default'
              : 'border-attention-default'
          )}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-primary font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-positive-default" />
            <span>3. Statutory Compliance Gates</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas text-text-tertiary">
            5 Invariants Checked
          </span>
        </div>

        <div className="mt-1 p-3 rounded-md surface-panel space-y-2 text-xs">
          {/* Gate 1: RBI Calling Window */}
          <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border-subtle">
            <div>
              <div className="font-mono text-[11px] text-text-primary font-medium flex items-center gap-1">
                <span className="text-positive-default">✓</span> RBI Calling Window (08:00–19:00 IST)
              </div>
              <div className="text-[10px] text-text-tertiary">{complianceChecks.rbiCallingWindow.detail}</div>
            </div>
            <span className="text-[10px] font-mono text-positive-default">PASS</span>
          </div>

          {/* Gate 2: e-Mandate AFA Threshold */}
          <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border-subtle">
            <div>
              <div className="font-mono text-[11px] font-medium flex items-center gap-1">
                {complianceChecks.emandateAfa.passed ? (
                  <span className="text-positive-default">✓</span>
                ) : (
                  <span className="text-attention-default">⚠</span>
                )}
                <span>e-Mandate AFA Ceiling (₹15,000)</span>
              </div>
              <div className="text-[10px] text-text-tertiary">{complianceChecks.emandateAfa.detail}</div>
            </div>
            <span
              className={clsx(
                'text-[10px] font-mono font-semibold',
                complianceChecks.emandateAfa.passed ? 'text-positive-default' : 'text-attention-default'
              )}
            >
              {complianceChecks.emandateAfa.passed ? 'PASS' : 'INTERCEPT'}
            </span>
          </div>

          {/* Gate 3: Section 43B(h) MSMED Act */}
          {transactionCase.caseType === 'b2b_receivable' && (
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border-subtle">
              <div>
                <div className="font-mono text-[11px] font-medium flex items-center gap-1">
                  {complianceChecks.msmed43Bh.passed ? (
                    <span className="text-positive-default">✓</span>
                  ) : (
                    <span className="text-attention-default">⚠</span>
                  )}
                  <span>MSMED Act §43B(h) 45-Day Dunning Clock</span>
                </div>
                <div className="text-[10px] text-text-tertiary">{complianceChecks.msmed43Bh.detail}</div>
              </div>
              <span
                className={clsx(
                  'text-[10px] font-mono font-semibold',
                  complianceChecks.msmed43Bh.passed ? 'text-positive-default' : 'text-attention-default'
                )}
              >
                {complianceChecks.msmed43Bh.daysRemaining !== undefined
                  ? `${complianceChecks.msmed43Bh.daysRemaining}D REMAINING`
                  : 'COMPLIANT'}
              </span>
            </div>
          )}

          {/* Gate 4: TRAI 1601 Header */}
          <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border-subtle">
            <div>
              <div className="font-mono text-[11px] text-text-primary font-medium flex items-center gap-1">
                <span className="text-positive-default">✓</span> TRAI 1601 Series DLT Header
              </div>
              <div className="text-[10px] text-text-tertiary">Verified transactional financial header series.</div>
            </div>
            <span className="text-[10px] font-mono text-positive-default">PASS</span>
          </div>

          {/* Gate 5: Nocturnal CBS Blackout */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-[11px] text-text-primary font-medium flex items-center gap-1">
                <span className="text-positive-default">✓</span> CBS Blackout Avoidance (23:30–03:30 IST)
              </div>
              <div className="text-[10px] text-text-tertiary">Safe daytime operational window.</div>
            </div>
            <span className="text-[10px] font-mono text-positive-default">PASS</span>
          </div>
        </div>
      </div>

      {/* ── INLINE HUMAN DECISION CARD (IF NEEDS REVIEW) ────────────────── */}
      {needsReview && (
        <HumanDecisionCard currentCase={transactionCase} onActionComplete={onActionComplete} />
      )}

      {/* Operator Decision Stamp if already decided */}
      {operatorDecision && (
        <div className="p-3 rounded-md surface-panel border border-brand-muted text-xs space-y-1">
          <div className="flex items-center justify-between text-brand-default font-mono text-[11px] font-semibold">
            <span>OPERATOR RESOLUTION RECORDED</span>
            <span>{new Date(operatorDecision.decidedAt).toLocaleTimeString()}</span>
          </div>
          <div className="text-text-primary">
            Action: <span className="font-mono font-semibold capitalize">{operatorDecision.action}</span>{' '}
            {operatorDecision.overrideAction && `(${operatorDecision.overrideAction})`}
          </div>
          <div className="text-text-secondary text-[11px] italic">
            &quot;{operatorDecision.note}&quot; — {operatorDecision.decidedBy}
          </div>
        </div>
      )}

      {/* ── STAGE 4: BAYESIAN TIMING / LIQUIDITY ENGINE ─────────────────── */}
      <div className="relative group">
        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-default font-semibold">
            4. Bayesian Timing &amp; Liquidity
          </span>
          <span className="text-[11px] font-mono text-text-tertiary">
            Delay: +{bayesianTiming.delayHours}h
          </span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-2">
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="p-1.5 rounded-xs bg-canvas border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Customer Tenure</div>
              <div className="text-xs font-semibold text-text-primary">{bayesianTiming.tenureEvents} events</div>
            </div>
            <div className="p-1.5 rounded-xs bg-canvas border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Shrinkage Weight (w)</div>
              <div className="text-xs font-semibold text-brand-default">{bayesianTiming.shrinkageWeight}</div>
            </div>
            <div className="p-1.5 rounded-xs bg-canvas border border-border-subtle">
              <div className="text-[10px] text-text-tertiary">Target Payday</div>
              <div className="text-xs font-semibold text-positive-default">Day {bayesianTiming.targetDay}</div>
            </div>
          </div>

          {/* Inline miniature timing curve */}
          <div className="h-6 w-full flex items-end gap-1 px-1 pt-1 bg-canvas/40 rounded-xs">
            {[10, 25, 45, 90, 60, 30, 15, 10].map((val, idx) => (
              <div
                key={idx}
                className={clsx(
                  'flex-1 rounded-t-xs transition-colors',
                  idx === 3 ? 'bg-brand-default h-full' : 'bg-border-default hover:bg-text-tertiary'
                )}
                style={{ height: `${val}%` }}
                title={`Slot ${idx + 1}: ${val}% optimal liquidity probability`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
            <span>Immediate (Fail)</span>
            <span className="text-brand-default font-semibold">Optimal Slot (Day {bayesianTiming.targetDay})</span>
            <span>Exhaustion</span>
          </div>
        </div>
      </div>

      {/* ── STAGE 5: SWITCH & RAIL SELECTION ────────────────────────────── */}
      <div className="relative group">
        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-default font-semibold">
            5. Switch &amp; Rail Selection
          </span>
          <span className="text-[11px] font-mono text-text-secondary">{rail}</span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Selected Routing Rail:</span>
            <span className="font-mono text-brand-default font-semibold px-2 py-0.5 rounded-xs bg-brand-subtle border border-brand-muted">
              {rail}
            </span>
          </div>
          {wasRerouted && (
            <div className="p-2 rounded-xs bg-brand-subtle border border-brand-muted text-[11px] text-brand-default font-mono leading-tight">
              ⚠ Failover Applied: {rerouteReason}
            </div>
          )}
        </div>
      </div>

      {/* ── STAGE 6: DISPATCH ───────────────────────────────────────────── */}
      <div className="relative group">
        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-default font-semibold">
            6. Multi-Channel Dispatch
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas text-text-tertiary capitalize">
            {dispatch.channel.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-2">
          {dispatch.paylinkUrl && (
            <div className="flex items-center justify-between p-2 rounded-xs bg-canvas border border-border-subtle">
              <span className="font-mono text-[11px] text-brand-default truncate max-w-[280px]">
                {dispatch.paylinkUrl}
              </span>
              <a
                href={dispatch.paylinkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-tertiary hover:text-brand-default"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {dispatch.voiceFsmState && (
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-text-secondary">Voicebot FSM State:</span>
              <span className="text-attention-default font-semibold px-1.5 py-0.5 rounded-xs bg-attention-subtle border border-attention-muted">
                {dispatch.voiceFsmState}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── STAGE 7: OUTCOME & CRYPTOGRAPHIC LEDGER ──────────────────────── */}
      <div className="relative group">
        <span
          className={clsx(
            'absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-canvas border-2',
            outcome.recoveredAmountPaise ? 'border-positive-default' : 'border-neutral-default'
          )}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-primary font-semibold">
            7. Outcome &amp; Cryptographic Ledger
          </span>
          <span className="text-[11px] font-mono text-text-tertiary">Block #{transactionCase.auditBlockIndex}</span>
        </div>
        <div className="mt-1 p-3 rounded-md surface-panel text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Status:</span>
            <span
              className={clsx(
                'font-mono font-semibold px-2 py-0.5 rounded-xs',
                outcome.recoveredAmountPaise
                  ? 'bg-positive-subtle text-positive-default border border-positive-muted'
                  : 'bg-neutral-subtle text-text-secondary border border-neutral-muted'
              )}
            >
              {outcome.recoveredAmountPaise
                ? `RECOVERED (₹${(outcome.recoveredAmountPaise / 100).toLocaleString('en-IN')})`
                : 'PENDING REMEDIATION'}
            </span>
          </div>

          <div className="pt-2 border-t border-border-subtle font-mono text-[10px] text-text-tertiary truncate">
            SHA-256 Hash: <span className="text-text-secondary">{transactionCase.auditBlockHash}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
