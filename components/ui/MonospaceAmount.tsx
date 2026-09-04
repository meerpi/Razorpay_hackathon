import React from 'react';
import { clsx } from 'clsx';

interface MonospaceAmountProps {
  amountRupees: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'display';
  className?: string;
  subtleDecimals?: boolean;
}

export const MonospaceAmount: React.FC<MonospaceAmountProps> = ({
  amountRupees,
  currency = '₹',
  size = 'md',
  className,
  subtleDecimals = true,
}) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountRupees);

  const [whole, decimals] = formatted.split('.');

  const sizeClasses = {
    sm: 'text-xs font-mono font-medium',
    md: 'text-sm font-mono font-semibold',
    lg: 'text-base font-mono font-semibold',
    display: 'text-2xl sm:text-[28px] leading-[34px] font-mono font-semibold tracking-tight',
  }[size];

  return (
    <span className={clsx('tabular-nums inline-flex items-baseline', sizeClasses, className)}>
      <span className="opacity-80 mr-0.5 text-[0.9em]">{currency}</span>
      <span>{whole}</span>
      {decimals && (
        <span className={clsx('text-[0.85em]', subtleDecimals ? 'text-text-tertiary' : 'opacity-90')}>
          .{decimals}
        </span>
      )}
    </span>
  );
};
