import React from 'react';
import { clsx } from 'clsx';
import { CaseStatus, DeclineClass, BankRail, PtpStatus } from '@/lib/types';

interface StatusBadgeProps {
  status?: CaseStatus;
  declineClass?: DeclineClass;
  rail?: BankRail;
  ptpStatus?: PtpStatus;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  declineClass,
  rail,
  ptpStatus,
  label,
  size = 'md',
  pulse = false,
  className,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (status) {
    const config = {
      needs_review: {
        bg: 'bg-human-amber/15 text-human-amber border-human-amber/40 shadow-[0_0_12px_var(--human-amber-glow)]',
        dot: 'bg-human-amber animate-ping',
        text: 'Needs review',
      },
      in_progress: {
        bg: 'bg-brand-blue/15 text-brand-blue border-brand-blue/35 shadow-[0_0_10px_var(--brand-blue-glow)]',
        dot: 'bg-brand-blue animate-pulse',
        text: 'In progress',
      },
      auto_resolved: {
        bg: 'bg-success-teal/15 text-success-teal border-success-teal/30',
        dot: 'bg-success-teal',
        text: 'Auto-resolved',
      },
      closed: {
        bg: 'bg-neutral-slate/15 text-text-tertiary border-neutral-slate/30',
        dot: 'bg-neutral-slate',
        text: 'Closed',
      },
    }[status];

    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-sm font-medium border uppercase tracking-wider',
          sizeClasses,
          config.bg,
          className
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
        {label || config.text}
      </span>
    );
  }

  if (declineClass) {
    const config = {
      hard: {
        bg: 'bg-danger-crimson/15 text-danger-crimson border-danger-crimson/30',
        text: 'Hard Decline (Cat 1)',
      },
      soft: {
        bg: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
        text: 'Soft Decline (Cat 2)',
      },
      technical: {
        bg: 'bg-human-amber/15 text-human-amber border-human-amber/30',
        text: 'Technical (Cat 2)',
      },
    }[declineClass];

    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-sm font-mono text-[11px] font-medium border uppercase tracking-wider px-2 py-0.5',
          config.bg,
          className
        )}
      >
        {label || config.text}
      </span>
    );
  }

  if (rail) {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-sm font-mono text-[11px] font-semibold border px-2 py-0.5 tracking-tight',
          'bg-canvas-raised/80 text-text-secondary border-glass-border',
          className
        )}
      >
        {rail}
      </span>
    );
  }

  if (ptpStatus) {
    const config = {
      PENDING: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
      KEPT: 'bg-success-teal/15 text-success-teal border-success-teal/30',
      BROKEN: 'bg-danger-crimson/15 text-danger-crimson border-danger-crimson/30',
    }[ptpStatus];

    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-sm font-mono text-[11px] font-semibold border px-2 py-0.5 uppercase tracking-wider',
          config,
          className
        )}
      >
        PTP: {ptpStatus}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-sm font-medium border bg-canvas-raised/80 text-text-secondary border-glass-border',
        sizeClasses,
        className
      )}
    >
      {label}
    </span>
  );
};
