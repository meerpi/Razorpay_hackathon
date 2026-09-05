import React from 'react';
import { clsx } from 'clsx';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'default' | 'amber' | 'blue' | 'interactive' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'surface',
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
    surface: 'surface-panel rounded-md',
    default: 'surface-panel rounded-md',
    interactive: 'surface-panel-interactive rounded-md cursor-pointer',
    blue: 'surface-panel rounded-md border-brand-muted',
    amber: 'glass-panel-amber rounded-md',
    glass: 'glass-panel rounded-md',
  }[variant];

  return (
    <div
      className={clsx(
        variantClasses,
        paddingClasses,
        'relative overflow-hidden text-text-primary transition-all duration-140',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
