'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { dataStore } from '@/lib/mock-data';
import { TransactionCase, CaseStatus, BankRail } from '@/lib/types';
import { QueueToolbar } from '@/components/queue/QueueToolbar';
import { TransactionQueueBlotter } from '@/components/queue/TransactionQueueBlotter';
import { CaseDetailSheet } from '@/components/case-detail/CaseDetailSheet';

export default function TransactionQueuePage() {
  const [cases, setCases] = useState<TransactionCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TransactionCase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [railFilter, setRailFilter] = useState<BankRail | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const allCases = dataStore.getCases();
      setCases(allCases);

      // Keep selected case updated if open
      if (selectedCase) {
        const fresh = allCases.find((c) => c.id === selectedCase.id);
        if (fresh) setSelectedCase(fresh);
      }
    };

    update();
    const unsub = dataStore.subscribe(update);
    return () => unsub();
  }, [selectedCase]);

  const handleSelectCase = (c: TransactionCase) => {
    setSelectedCase(c);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  // Filter and sort: `needs_review` cases are always sorted to top!
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (railFilter !== 'all' && c.rail !== railFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesId = c.id.toLowerCase().includes(q);
          const matchesName = c.customerName.toLowerCase().includes(q);
          const matchesPayment = c.paymentId.toLowerCase().includes(q);
          const matchesReason = c.errorReason.toLowerCase().includes(q);
          if (!matchesId && !matchesName && !matchesPayment && !matchesReason) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Needs review cases sort to top
        if (a.status === 'needs_review' && b.status !== 'needs_review') return -1;
        if (b.status === 'needs_review' && a.status !== 'needs_review') return 1;
        // Then by timestamp descending
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [cases, statusFilter, railFilter, searchQuery]);

  const needsReviewCount = useMemo(() => {
    return cases.filter((c) => c.status === 'needs_review').length;
  }, [cases]);

  return (
    <div className="space-y-4">
      {/* Header Eyebrow (No Hero Tiles, Pure Operational Context) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Live Transaction Queue
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-0.5">
            Event-driven recovery stream · Inspectable &amp; interruptible per transaction
          </p>
        </div>

        <div className="text-right text-[11px] font-mono text-text-tertiary">
          <span>Active Blotter: </span>
          <span className="text-text-primary font-semibold">{filteredCases.length}</span>
          <span> of </span>
          <span>{cases.length} events</span>
        </div>
      </div>

      {/* Queue Toolbar: Filters, Search, Pinned Counter */}
      <QueueToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        railFilter={railFilter}
        onRailFilterChange={setRailFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        needsReviewCount={needsReviewCount}
        totalCount={cases.length}
      />

      {/* Transaction Blotter Table */}
      <TransactionQueueBlotter
        cases={filteredCases}
        onSelectCase={handleSelectCase}
        selectedCaseId={selectedCase?.id}
      />

      {/* Case Detail Sheet (Sliding full-height glass sheet) */}
      <CaseDetailSheet
        transactionCase={selectedCase}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        onActionComplete={() => {
          // Re-fetch state
          const allCases = dataStore.getCases();
          setCases([...allCases]);
          if (selectedCase) {
            const fresh = allCases.find((x) => x.id === selectedCase.id);
            if (fresh) setSelectedCase(fresh);
          }
        }}
      />
    </div>
  );
}
