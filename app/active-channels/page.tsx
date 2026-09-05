'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  PhoneCall,
  Link2,
  CalendarCheck,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { ActiveVoiceCall, ActivePayLink, PtpCommitment, TransactionCase } from '@/lib/types';
import { CaseDetailSheet } from '@/components/case-detail/CaseDetailSheet';
import { MonospaceAmount } from '@/components/ui/MonospaceAmount';

const formatVoiceState = (state: string) => {
  switch (state) {
    case 'HUMAN_ESCALATION':
      return 'Human Escalation';
    case 'RIGHT_PARTY_VERIFICATION':
      return 'Right-Party Verification';
    case 'PAYMENT_DISCUSSION':
      return 'Payment Discussion';
    case 'PTP_NEGOTIATION':
      return 'PTP Negotiation';
    case 'DISPUTE_RESOLUTION':
      return 'Dispute Resolution';
    default:
      return state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export default function ActiveChannelsPage() {
  const [voiceCalls, setVoiceCalls] = useState<ActiveVoiceCall[]>([]);
  const [payLinks, setPayLinks] = useState<ActivePayLink[]>([]);
  const [ptps, setPtps] = useState<PtpCommitment[]>([]);
  const [cases, setCases] = useState<TransactionCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TransactionCase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'links' | 'ptp'>('voice');

  useEffect(() => {
    const update = () => {
      setVoiceCalls(dataStore.getVoiceCalls());
      setPayLinks(dataStore.getPayLinks());
      setPtps(dataStore.getPtps());
      setCases(dataStore.getCases());
    };
    update();
    const unsub = dataStore.subscribe(update);
    return () => unsub();
  }, []);

  const handleOpenCase = (caseId: string) => {
    const found = cases.find((c) => c.id === caseId);
    if (found) {
      setSelectedCase(found);
      setIsSheetOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Radio className="w-5 h-5 text-brand-blue" />
            <span>Active Channels Dispatch</span>
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-1">
            Live in-flight remediation streams · One row per active case
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-md surface-panel font-mono text-xs select-none">
          <button
            onClick={() => setActiveTab('voice')}
            className={clsx(
              'px-3 py-1.5 rounded-xs transition-all flex items-center gap-1.5',
              activeTab === 'voice'
                ? 'bg-brand-default text-white font-semibold shadow-raised-low'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Voicebot Fleet ({voiceCalls.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={clsx(
              'px-3 py-1.5 rounded-xs transition-all flex items-center gap-1.5',
              activeTab === 'links'
                ? 'bg-brand-default text-white font-semibold shadow-raised-low'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Smart PayLinks ({payLinks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ptp')}
            className={clsx(
              'px-3 py-1.5 rounded-xs transition-all flex items-center gap-1.5',
              activeTab === 'ptp'
                ? 'bg-brand-default text-white font-semibold shadow-raised-low'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>PTP Commitments ({ptps.length})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: VOICEBOT FLEET ────────────────────────────────────────── */}
      {activeTab === 'voice' && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-text-tertiary">
            Active Telephony Sessions (TRAI 1601 Header · Hinglish NLP · RPV Enforced)
          </div>

          <div className="grid grid-cols-1 gap-3">
            {voiceCalls.map((call) => {
              const isHumanEscalation = call.state === 'HUMAN_ESCALATION';

              return (
                <div
                  key={call.callId}
                  onClick={() => handleOpenCase(call.caseId)}
                  className={clsx(
                    'p-4 rounded-md border cursor-pointer transition-all',
                    isHumanEscalation
                      ? 'bg-attention-subtle/30 border-attention-muted'
                      : 'surface-panel hover:bg-canvas'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={clsx(
                          'w-7 h-7 rounded-xs flex items-center justify-center',
                          isHumanEscalation
                            ? 'bg-attention-subtle text-attention-emphasis'
                            : 'bg-brand-subtle text-brand-emphasis'
                        )}
                      >
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-text-primary text-xs">
                          {call.customerName} · {call.customerPhone}
                        </div>
                        <div className="text-[11px] font-mono text-text-tertiary">
                          Origin: {call.originatingNumber} · Case: {call.caseId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MonospaceAmount amountRupees={call.amountRupees} size="md" />
                      <span
                        className={clsx(
                          'px-2.5 py-1 rounded-xs text-xs font-mono font-semibold',
                          isHumanEscalation
                            ? 'bg-attention-subtle text-attention-emphasis border border-attention-muted'
                            : 'bg-brand-subtle text-brand-emphasis border border-brand-muted'
                        )}
                      >
                        {formatVoiceState(call.state)}
                      </span>
                    </div>
                  </div>

                  {/* Transcript Snippet */}
                  <div className="pt-2.5 flex items-start justify-between gap-3 text-xs font-mono text-text-secondary">
                    <p className="italic text-[11px] text-text-secondary truncate max-w-xl">
                      &quot;{call.transcriptSnippet}&quot;
                    </p>
                    <span className="text-[11px] text-text-tertiary whitespace-nowrap">
                      Call Time: {call.durationSeconds}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: SMART PAYLINKS ───────────────────────────────────────── */}
      {activeTab === 'links' && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-text-tertiary">
            Pending Dynamic PayLinks (Pre-filled 1-Click Razorpay Checkout)
          </div>

          <div className="overflow-hidden rounded-md border border-border-subtle surface-panel">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-medium text-text-tertiary bg-canvas-raised">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Short URL</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Expires in</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border-subtle">
                {payLinks.map((link) => (
                  <tr
                    key={link.linkId}
                    onClick={() => handleOpenCase(link.caseId)}
                    className="hover:bg-canvas cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-sans font-medium text-text-primary">
                      {link.customerName}
                    </td>
                    <td className="py-3 px-4 text-brand-emphasis font-semibold">
                      <div className="flex items-center gap-1">
                        <span>{link.shortUrl}</span>
                        <ExternalLink className="w-3 h-3 text-text-tertiary" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MonospaceAmount amountRupees={link.amountRupees} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{link.channel}</td>
                    <td className="py-3 px-4 text-text-tertiary">{link.expiresInMinutes} mins</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-brand-subtle text-brand-emphasis border border-brand-muted capitalize">
                        {link.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PTP COMMITMENTS ──────────────────────────────────────── */}
      {activeTab === 'ptp' && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-text-tertiary">
            Promise-to-Pay Commitments (24-Hour Grace Period Enforced)
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ptps.map((p) => {
              const isBroken = p.status === 'BROKEN';
              const isKept = p.status === 'KEPT';

              return (
                <div
                  key={p.ptpId}
                  onClick={() => handleOpenCase(p.caseId)}
                  className="p-4 rounded-md surface-panel hover:bg-canvas border border-border-subtle cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
                    <div>
                      <div className="font-semibold text-text-primary text-xs font-sans">
                        {p.customerName} · {p.customerPhone}
                      </div>
                      <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                        Promised Date: <span className="text-text-primary font-semibold">{p.promisedDate}</span> ·
                        Grace: {p.graceHoursRemaining}h remaining
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MonospaceAmount amountRupees={p.amountRupees} size="md" />
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 rounded-xs text-xs font-mono font-semibold',
                          isKept && 'bg-positive-subtle text-positive-emphasis border border-positive-muted',
                          isBroken && 'bg-negative-subtle text-negative-emphasis border border-negative-muted',
                          !isKept && !isBroken && 'bg-brand-subtle text-brand-emphasis border border-brand-muted'
                        )}
                      >
                        {isKept ? 'Kept' : isBroken ? 'Broken' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <p className="pt-2 text-xs font-mono text-text-secondary italic">
                    &quot;{p.notes}&quot;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Case Detail Sheet */}
      <CaseDetailSheet
        transactionCase={selectedCase}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
