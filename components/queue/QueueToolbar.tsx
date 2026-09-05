'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import { CaseStatus, BankRail } from '@/lib/types';

interface QueueToolbarProps {
  statusFilter: CaseStatus | 'all';
  onStatusFilterChange: (status: CaseStatus | 'all') => void;
  railFilter: BankRail | 'all';
  onRailFilterChange: (rail: BankRail | 'all') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  needsReviewCount: number;
  totalCount: number;
}

export const QueueToolbar: React.FC<QueueToolbarProps> = ({
  statusFilter,
  onStatusFilterChange,
  railFilter,
  onRailFilterChange,
  searchQuery,
  onSearchQueryChange,
  needsReviewCount,
  totalCount,
}) => {
  const statusOptions: { id: CaseStatus | 'all'; label: string; count?: number; isAmber?: boolean }[] = [
    { id: 'all', label: 'All Cases', count: totalCount },
    {
      id: 'needs_review',
      label: 'Needs Review',
      count: needsReviewCount,
      isAmber: true,
    },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'auto_resolved', label: 'Auto-Resolved' },
    { id: 'closed', label: 'Closed' },
  ];

  const railOptions: (BankRail | 'all')[] = ['all', 'HDFC', 'SBI · NPCI', 'ICICI', 'AXIS', 'UPI Intent'];

  return (
    <div className="space-y-3 pb-3 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pinned Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {statusOptions.map((opt) => {
            const isActive = statusFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onStatusFilterChange(opt.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5',
                  opt.isAmber && needsReviewCount > 0 && !isActive
                    ? 'bg-attention-subtle text-attention-emphasis border border-attention-muted hover:bg-attention-subtle/80'
                    : '',
                  isActive && opt.isAmber
                    ? 'bg-attention-default text-canvas border border-attention-default font-semibold'
                    : '',
                  isActive && !opt.isAmber
                    ? 'bg-brand-default text-white border border-brand-default font-semibold'
                    : '',
                  !isActive && !opt.isAmber
                    ? 'surface-panel text-text-secondary hover:text-text-primary hover:bg-canvas'
                    : ''
                )}
              >
                {opt.isAmber && <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={clsx(
                      'text-[10px] px-1.5 py-0.2 rounded-xs font-mono',
                      isActive ? 'bg-black/30' : 'bg-canvas-raised'
                    )}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Rail Filter & Search Bar */}
        <div className="flex items-center gap-2">
          {/* Rail Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
            <select
              value={railFilter}
              onChange={(e) => onRailFilterChange(e.target.value as BankRail | 'all')}
              className="bg-canvas-raised border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-brand-default font-mono"
            >
              <option value="all">All Bank Rails</option>
              {railOptions
                .filter((r) => r !== 'all')
                .map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search case, name, ref..."
              className="pl-8 pr-3 py-1.5 bg-canvas-raised border border-border-subtle rounded-md text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-default w-48 sm:w-60 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
