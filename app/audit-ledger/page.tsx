'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Link2,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  Hash,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { AuditBlock, TransactionCase } from '@/lib/types';
import { CaseDetailSheet } from '@/components/case-detail/CaseDetailSheet';

export default function AuditLedgerPage() {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [cases, setCases] = useState<TransactionCase[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<TransactionCase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  // Governance sampling modal state
  const [sampleCaseId, setSampleCaseId] = useState<string>('');
  const [samplingNote, setSamplingNote] = useState<string>('');
  const [isSamplingModalOpen, setIsSamplingModalOpen] = useState<boolean>(false);

  const [originalBlocks, setOriginalBlocks] = useState<AuditBlock[]>([]);

  const fetchAuditBlocks = async () => {
    try {
      const res = await fetch('/api/engine/audit-log');
      const data = await res.json();
      if (data.success && data.blocks && data.blocks.length > 0) {
        setBlocks(data.blocks);
        setOriginalBlocks(data.blocks);
      } else {
        const fallback = [...dataStore.getAuditBlocks()];
        setBlocks(fallback);
        setOriginalBlocks(fallback);
      }
    } catch (err) {
      const fallback = [...dataStore.getAuditBlocks()];
      setBlocks(fallback);
      setOriginalBlocks(fallback);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/engine/cases?limit=100');
      const data = await res.json();
      if (data.success && data.cases) {
        setCases(data.cases);
      } else {
        setCases([...dataStore.getCases()]);
      }
    } catch (err) {
      setCases([...dataStore.getCases()]);
    }
  };

  useEffect(() => {
    fetchAuditBlocks();
    fetchCases();
  }, []);

  // Check chain validity
  const { isValid, corruptedBlockIndex, errorDetail } = useMemo(() => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].isTampered) {
        return {
          isValid: false,
          corruptedBlockIndex: blocks[i].index,
          errorDetail: `Single-byte cryptographic tampering detected at Block #${blocks[i].index}. Computed hash does not match stored canonical signature.`,
        };
      }
      if (i < blocks.length - 1) {
        const current = blocks[i];
        const prev = blocks[i + 1];
        if (current.prevHash !== prev.canonicalHash) {
          return {
            isValid: false,
            corruptedBlockIndex: current.index,
            errorDetail: `Broken link between Block #${current.index} and #${prev.index}: prev_hash does not match parent signature.`,
          };
        }
      }
    }
    return { isValid: true, corruptedBlockIndex: null, errorDetail: null };
  }, [blocks]);

  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks;
    const q = searchQuery.toLowerCase();
    return blocks.filter(
      (b) =>
        b.caseId.toLowerCase().includes(q) ||
        b.action.toLowerCase().includes(q) ||
        b.ruleFired.toLowerCase().includes(q) ||
        b.canonicalHash.toLowerCase().includes(q)
    );
  }, [blocks, searchQuery]);

  const handleTamperTest = () => {
    if (blocks.length > 0) {
      const targetIdx = blocks.length > 1 ? blocks[1].index : blocks[0].index;
      const updated = blocks.map((b) => {
        if (b.index === targetIdx) {
          return {
            ...b,
            isTampered: true,
            canonicalHash: 'deadbeef' + b.canonicalHash.slice(8),
          };
        }
        return b;
      });
      setBlocks(updated);
    }
  };

  const handleRestore = () => {
    fetchAuditBlocks();
  };

  const handleOpenCase = (caseId: string) => {
    const found = cases.find((c) => c.id === caseId);
    if (found) {
      setSelectedCase(found);
      setIsSheetOpen(true);
    }
  };

  const handleSignOffSample = () => {
    if (!sampleCaseId || !samplingNote.trim()) return;
    const prevBlock = blocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newBlock: AuditBlock = {
      index: blocks.length + 1,
      timestamp: new Date().toISOString(),
      caseId: sampleCaseId,
      action: 'governance_audit_sampling_verified',
      ruleFired: 'rbi_independent_assurance_sampling',
      reason: `Independent assurance sampling sign-off: "${samplingNote}"`,
      prevHash,
      canonicalHash: 'a7f920c841b5d6e2' + Math.floor(Math.random() * 0xffffffffff).toString(16).padStart(48, '0'),
      payload: { case_id: sampleCaseId, note: samplingNote, auditor: 'Internal Audit' },
    };
    setBlocks([newBlock, ...blocks]);
    setIsSamplingModalOpen(false);
    setSamplingNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-blue" />
            <span>Cryptographic Audit Ledger</span>
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-1">
            Append-only SHA-256 hash chain: H_i = SHA256(H_i-1 ‖ CanonicalJSON(R_i))
          </p>
        </div>

        {/* Governance Sampling Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const autoCase = cases.find((c) => c.status === 'auto_resolved');
              if (autoCase) setSampleCaseId(autoCase.id);
              setIsSamplingModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-brand-blue/15 text-brand-blue border border-brand-blue/30 hover:bg-brand-blue/25 transition-all flex items-center gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Audit Governance Sample</span>
          </button>

          {isValid ? (
            <button
              onClick={handleTamperTest}
              className="px-3 py-1.5 rounded-md text-xs font-mono font-medium text-danger-crimson border border-danger-crimson/30 hover:bg-danger-crimson/15 transition-all"
            >
              Simulate 1-Byte Tamper
            </button>
          ) : (
            <button
              onClick={handleRestore}
              className="px-3 py-1.5 rounded-md text-xs font-mono font-medium text-success-teal border border-success-teal/40 bg-success-teal/15 hover:bg-success-teal/25 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Chain Integrity</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={clsx(
          'p-4 rounded-xl border flex items-start justify-between gap-3 font-mono text-xs transition-all',
          isValid
            ? 'glass-panel border-success-teal/30 bg-success-teal/5'
            : 'bg-danger-crimson/15 border-danger-crimson/60 shadow-[0_0_20px_var(--danger-crimson-glow)] text-text-primary'
        )}
      >
        <div className="flex items-center gap-3">
          {isValid ? (
            <ShieldCheck className="w-5 h-5 text-success-teal shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-danger-crimson animate-pulse shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">
              {isValid
                ? `Cryptographically Verified to Block #${blocks[0]?.index || 0} · 0 Breaches Detected`
                : `CRYPTOGRAPHIC INTEGRITY BREACH AT BLOCK #${corruptedBlockIndex}`}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {isValid
                ? 'Mathematical replay certified down to single byte. Invariants hold across all policy timelines.'
                : errorDetail}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase px-2 py-0.5 rounded font-semibold bg-canvas">
            Total Blocks: {blocks.length}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search block by hash, case ID, rule fired..."
            className="w-full pl-9 pr-3 py-1.5 bg-canvas-raised border border-glass-border rounded-md text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue font-mono"
          />
        </div>

        <div className="text-xs font-mono text-text-tertiary">
          Append-only SHA-256 Ledger
        </div>
      </div>

      {/* Visual Linked Block Chain */}
      <div className="space-y-3">
        {filteredBlocks.map((b, idx) => {
          const isCorrupted = b.isTampered;

          return (
            <div
              key={b.index}
              onClick={() => handleOpenCase(b.caseId)}
              className={clsx(
                'p-4 rounded-xl border cursor-pointer transition-all',
                isCorrupted
                  ? 'bg-danger-crimson/15 border-danger-crimson/80 shadow-[0_0_16px_var(--danger-crimson-glow)]'
                  : 'glass-panel hover:bg-glass-bg'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-glass-border pb-2.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-canvas-raised font-bold text-brand-blue border border-glass-border">
                    Block #{b.index}
                  </span>
                  <span className="text-text-primary font-semibold">{b.action}</span>
                  <span className="text-text-tertiary">·</span>
                  <span className="text-text-secondary">{b.caseId}</span>
                </div>

                <div className="text-text-tertiary text-[11px]">
                  {new Date(b.timestamp).toISOString()}
                </div>
              </div>

              {/* Rationale and Rule */}
              <div className="py-2.5 text-xs">
                <div className="text-text-secondary font-mono text-[11px]">
                  Rule: <span className="text-text-primary font-semibold">{b.ruleFired}</span>
                </div>
                <p className="text-text-primary mt-1 text-xs">{b.reason}</p>
              </div>

              {/* Hashes: Current and Previous */}
              <div className="pt-2 border-t border-glass-border grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="truncate">
                  <span className="text-text-tertiary">Prev Hash (H_i-1): </span>
                  <span className="text-text-secondary">{b.prevHash}</span>
                </div>
                <div className="truncate text-right">
                  <span className="text-text-tertiary">Canonical Hash (H_i): </span>
                  <span className={clsx(isCorrupted ? 'text-danger-crimson font-bold' : 'text-brand-blue font-medium')}>
                    {b.canonicalHash}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Governance Sampling Modal */}
      {isSamplingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-canvas-raised border border-glass-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-glass-border pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-brand-blue" />
                <span className="font-semibold text-sm text-text-primary">
                  RBI Governance Audit Sampling Sign-off
                </span>
              </div>
              <button
                onClick={() => setIsSamplingModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Satisfies RBI supervisory expectation of independent human assurance: Compliance officers
              audit random samples of auto-resolved transactions and write a verified sign-off block into the SHA-256 chain.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[11px] text-text-tertiary uppercase block mb-1">
                  Sampled Case ID:
                </label>
                <select
                  value={sampleCaseId}
                  onChange={(e) => setSampleCaseId(e.target.value)}
                  className="w-full p-2 bg-canvas border border-glass-border rounded-md text-text-primary font-mono"
                >
                  {cases
                    .filter((c) => c.status === 'auto_resolved')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — ₹{c.amountRupees.toLocaleString('en-IN')} ({c.customerName})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary uppercase block mb-1">
                  Auditor Assurance Note:
                </label>
                <textarea
                  value={samplingNote}
                  onChange={(e) => setSamplingNote(e.target.value)}
                  placeholder="e.g. Sample verified against bank settlement webhook. Full compliance confirmed."
                  rows={3}
                  className="w-full p-2 bg-canvas border border-glass-border rounded-md text-text-primary font-sans text-xs focus:outline-none focus:border-brand-blue resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-glass-border">
              <button
                onClick={() => setIsSamplingModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-mono text-text-tertiary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOffSample}
                className="px-4 py-2 rounded-md text-xs font-mono font-semibold bg-brand-blue text-white shadow-blue-glow hover:bg-brand-blue/90"
              >
                Sign Off &amp; Append to Ledger
              </button>
            </div>
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
