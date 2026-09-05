'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TransactionCase, CaseStatus, BankRail, CaseType, DeclineClass } from '@/lib/types';
import { QueueToolbar } from '@/components/queue/QueueToolbar';
import { TransactionQueueBlotter } from '@/components/queue/TransactionQueueBlotter';
import { CaseDetailSheet } from '@/components/case-detail/CaseDetailSheet';
import { ArrowLeft, Filter, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL query params
  const initialType = (searchParams.get('type') as CaseType) || 'all';
  const initialClass = (searchParams.get('class') as DeclineClass) || 'all';
  const initialStatus = (searchParams.get('status') as CaseStatus) || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [cases, setCases] = useState<TransactionCase[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [selectedCase, setSelectedCase] = useState<TransactionCase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>(initialStatus);
  const [railFilter, setRailFilter] = useState<BankRail | 'all'>('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseType | 'all'>(initialType);
  const [declineClassFilter, setDeclineClassFilter] = useState<DeclineClass | 'all'>(initialClass);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const limit = 50;

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (caseTypeFilter !== 'all') params.set('case_type', caseTypeFilter);
      if (declineClassFilter !== 'all') params.set('decline_class', declineClassFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/engine/cases?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCases(data.cases);
        setTotalCount(data.total);
        if (data.counts) {
          setNeedsReviewCount(data.counts.needs_review || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load engine cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter, caseTypeFilter, declineClassFilter, searchQuery]);

  // Keep selected case updated if open
  useEffect(() => {
    if (selectedCase && cases.length > 0) {
      const fresh = cases.find((c) => c.id === selectedCase.id);
      if (fresh) setSelectedCase(fresh);
    }
  }, [cases]);

  const handleSelectCase = (c: TransactionCase) => {
    setSelectedCase(c);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setRailFilter('all');
    setCaseTypeFilter('all');
    setDeclineClassFilter('all');
    setSearchQuery('');
    setPage(1);
    router.replace('/queue');
  };

  const hasActivePreset = caseTypeFilter !== 'all' || declineClassFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Header with Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary mb-1">
            <Link href="/" className="hover:text-text-primary flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Overview Scoreboard
            </Link>
            <span>/</span>
            <span className="text-text-primary">Live Case Blotter</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Transaction Queue Blotter
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Autonomous decline triage and recovery dispatch · {totalCount.toLocaleString()} events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCases}
            disabled={loading}
            className="px-3 py-1.5 rounded-md text-xs font-mono surface-panel border border-border-subtle hover:bg-canvas text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
            title="Refresh cases from disk"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Preset Filter Indicator Banner */}
      {hasActivePreset && (
        <div className="p-3 rounded-md border border-brand-muted bg-brand-subtle/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-default" />
            <span className="text-text-secondary">Filtered by Category:</span>
            {caseTypeFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-xs bg-brand-subtle text-brand-emphasis font-semibold uppercase text-[10px]">
                Type: {caseTypeFilter}
              </span>
            )}
            {declineClassFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-xs bg-negative-subtle text-negative-emphasis font-semibold uppercase text-[10px]">
                Class: {declineClassFilter}
              </span>
            )}
          </div>
          <button
            onClick={clearAllFilters}
            className="text-text-tertiary hover:text-text-primary flex items-center gap-1 text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            Clear filter
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <QueueToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        railFilter={railFilter}
        onRailFilterChange={setRailFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        needsReviewCount={needsReviewCount}
        totalCount={totalCount}
      />

      {/* Dense Transaction Blotter Table */}
      {loading && cases.length === 0 ? (
        <div className="p-12 text-center text-text-tertiary font-mono text-xs surface-panel rounded-md border border-border-subtle">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-default" />
          Loading cases from engine log...
        </div>
      ) : (
        <TransactionQueueBlotter
          cases={cases}
          onSelectCase={handleSelectCase}
          selectedCaseId={selectedCase?.id}
        />
      )}

      {/* Pagination Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-text-tertiary pt-2 border-t border-border-subtle">
        <span>
          Showing {cases.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
          {Math.min(page * limit, totalCount)} of {totalCount.toLocaleString()} cases
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 rounded-xs border border-border-subtle surface-panel hover:bg-canvas text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-2 py-1 text-text-primary font-semibold">
            Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= totalCount || loading}
            className="px-3 py-1 rounded-xs border border-border-subtle surface-panel hover:bg-canvas text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Slide-over Case Detail Sheet */}
      <CaseDetailSheet
        transactionCase={selectedCase}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
      />
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-mono text-text-tertiary">
          Loading Queue...
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
