import React from 'react';
import { clsx } from 'clsx';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'amber' | 'blue' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-7',
  }[padding];

  const variantClasses = {
    default: 'glass-panel rounded-lg',
    interactive: 'glass-panel-interactive rounded-lg cursor-pointer',
    amber: 'glass-panel-amber rounded-lg',
    blue: 'glass-panel rounded-lg shadow-blue-glow border-brand-blue/30',
  }[variant];

  return (
    <div
      className={clsx(
        variantClasses,
        paddingClasses,
        'relative overflow-hidden text-text-primary transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
