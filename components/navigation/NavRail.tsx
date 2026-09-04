'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Layers,
  Radio,
  ShieldCheck,
  PhoneCall,
  Link2,
  FileText,
  Sun,
  Moon,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';

export const NavRail: React.FC = () => {
  const pathname = usePathname();
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [hasDegradedSwitch, setHasDegradedSwitch] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const update = () => {
      const cases = dataStore.getCases();
      setNeedsReviewCount(cases.filter((c) => c.status === 'needs_review').length);
      const switches = dataStore.getSwitches();
      setHasDegradedSwitch(switches.some((s) => s.isDegraded));
    };

    update();
    const unsub = dataStore.subscribe(update);
    return () => unsub();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const navItems = [
    {
      href: '/',
      label: 'Transaction Queue',
      icon: Layers,
      badge: needsReviewCount > 0 ? needsReviewCount : undefined,
      badgeColor: 'amber',
    },
    {
      href: '/test-runner',
      label: 'Test Lab (Live API)',
      icon: FlaskConical,
      badge: 'TESTBED',
      badgeColor: 'blue',
      highlight: true,
    },
    {
      href: '/switch-health',
      label: 'Switch & Rail Health',
      icon: Radio,
      badge: hasDegradedSwitch ? 'FAILOVER' : undefined,
      badgeColor: 'blue',
    },
    {
      href: '/compliance',
      label: 'Compliance & Gating',
      icon: ShieldCheck,
      badge: undefined,
    },
    {
      href: '/active-channels',
      label: 'Active Channels',
      icon: PhoneCall,
      badge: undefined,
    },
    {
      href: '/audit-ledger',
      label: 'Cryptographic Ledger',
      icon: Link2,
      badge: 'SHA-256',
      badgeColor: 'slate',
    },
  ];

  return (
    <aside className="w-64 fixed inset-y-0 left-0 z-30 bg-canvas-raised/80 backdrop-blur-glass border-r border-glass-border flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-glass-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand-blue flex items-center justify-center font-bold text-white shadow-blue-glow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.0001 2L2 19.5H7.5L12.0001 11.5L16.5 19.5H22L12.0001 2Z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-text-primary flex items-center gap-1.5">
                Razorpay
                <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-brand-navy border border-brand-blue/30 text-brand-blue">
                  Agent
                </span>
              </div>
              <div className="text-[11px] text-text-tertiary font-mono tracking-wider uppercase">
                Revenue Recovery NOC
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-text-tertiary">
            Operations Blotter
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group',
                  item.highlight && !isActive
                    ? 'border border-brand-blue/40 bg-brand-blue/10 text-text-primary hover:bg-brand-blue/20'
                    : '',
                  isActive
                    ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30 shadow-[0_0_12px_var(--brand-blue-glow)]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-glass-bg border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-brand-blue' : item.highlight ? 'text-brand-blue' : 'text-text-tertiary group-hover:text-text-primary'
                    )}
                    strokeWidth={1.75}
                  />
                  <span className={clsx(item.highlight && 'font-semibold')}>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={clsx(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold',
                      item.badgeColor === 'amber' &&
                        'bg-human-amber/20 text-human-amber border border-human-amber/50 shadow-[0_0_8px_var(--human-amber-glow)] animate-pulse',
                      item.badgeColor === 'blue' &&
                        'bg-brand-blue/20 text-brand-blue border border-brand-blue/40',
                      item.badgeColor === 'slate' &&
                        'bg-neutral-slate/20 text-text-tertiary border border-neutral-slate/40'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Collateral */}
      <div className="p-3 border-t border-glass-border space-y-2">
        {/* Real Testbed Connection Status */}
        <div className="p-2.5 rounded-md glass-panel flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-teal" />
            <span className="text-text-secondary truncate max-w-[130px]" title="rzp_test_TVCK6KI3mrkU07">
              rzp_test_TVCK...
            </span>
          </div>
          <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-success-teal/20 text-success-teal font-bold">
            LIVE
          </span>
        </div>

        {/* Impact Report Link (Hackathon Collateral — marked clearly) */}
        <Link
          href="/impact-report"
          className="flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-mono text-text-tertiary hover:text-brand-blue hover:bg-glass-bg transition-colors border border-transparent hover:border-brand-blue/30"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Impact Report (RCT)</span>
          </div>
          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-slate/20 text-text-tertiary">
            Hackathon
          </span>
        </Link>

        {/* Theme & Mode Bar */}
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-text-tertiary">
          <span className="font-mono">v1.0-cmd</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
