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
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  if (status) {
    const config = {
      needs_review: {
        bg: 'bg-attention-subtle text-attention-default border-attention-muted shadow-amber-glow',
        dot: 'bg-attention-default animate-ping',
        text: 'Needs review',
      },
      in_progress: {
        bg: 'bg-brand-subtle text-brand-default border-brand-muted',
        dot: 'bg-brand-default animate-pulse',
        text: 'In progress',
      },
      auto_resolved: {
        bg: 'bg-positive-subtle text-positive-default border-positive-muted',
        dot: 'bg-positive-default',
        text: 'Auto-resolved',
      },
      closed: {
        bg: 'bg-neutral-subtle text-text-tertiary border-neutral-muted',
        dot: 'bg-neutral-default',
        text: 'Closed',
      },
    }[status];

    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-xs font-medium border text-[11px]',
          sizeClasses,
          config.bg,
          className
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
        {label || config.text}
      </span>
    );
  }

  if (declineClass) {
    const config = {
      hard: {
        bg: 'bg-negative-subtle text-negative-default border-negative-muted',
        text: 'Hard Decline (Cat 1)',
      },
      soft: {
        bg: 'bg-brand-subtle text-brand-default border-brand-muted',
        text: 'Soft Decline (Cat 2)',
      },
      technical: {
        bg: 'bg-attention-subtle text-attention-default border-attention-muted',
        text: 'Technical (Cat 2)',
      },
    }[declineClass];

    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-xs font-mono text-[11px] font-medium border px-2 py-0.5',
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
          'inline-flex items-center rounded-xs font-mono text-[11px] font-medium border px-2 py-0.5',
          'bg-canvas-raised text-text-secondary border-border-subtle',
          className
        )}
      >
        {rail}
      </span>
    );
  }

  if (ptpStatus) {
    const config = {
      PENDING: 'bg-brand-subtle text-brand-default border-brand-muted',
      KEPT: 'bg-positive-subtle text-positive-default border-positive-muted',
      BROKEN: 'bg-negative-subtle text-negative-default border-negative-muted',
    }[ptpStatus];

    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-xs font-mono text-[11px] font-semibold border px-2 py-0.5',
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
        'inline-flex items-center rounded-xs font-medium border bg-canvas-raised text-text-secondary border-border-subtle',
        sizeClasses,
        className
      )}
    >
      {label}
    </span>
  );
};
