'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  BarChart3,
  Layers,
  Radio,
  ShieldCheck,
  PhoneCall,
  Link2,
  FileText,
  Sun,
  Moon,
  FlaskConical,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';

export const NavRail: React.FC = () => {
  const pathname = usePathname();
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [hasDegradedSwitch, setHasDegradedSwitch] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check initial counts from API or dataStore
    fetch('/api/engine/cases?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.counts) {
          setNeedsReviewCount(data.counts.needs_review || 0);
        }
      })
      .catch(() => {
        const cases = dataStore.getCases();
        setNeedsReviewCount(cases.filter((c) => c.status === 'needs_review').length);
      });

    const update = () => {
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

  const navSections = [
    {
      title: 'Recovery Performance',
      items: [
        {
          href: '/',
          label: 'Overview & Scoreboard',
          icon: BarChart3,
        },
        {
          href: '/queue',
          label: 'Case Queue Blotter',
          icon: Layers,
          badge: needsReviewCount > 0 ? needsReviewCount : undefined,
          badgeColor: 'amber',
        },
      ],
    },
    {
      title: 'Statutory & Telemetry',
      items: [
        {
          href: '/compliance',
          label: 'Compliance & Gating',
          icon: ShieldCheck,
        },
        {
          href: '/audit-ledger',
          label: 'Cryptographic Ledger',
          icon: Link2,
          badge: 'SHA-256',
          badgeColor: 'slate',
        },
        {
          href: '/switch-health',
          label: 'Switch & Rail Health',
          icon: Radio,
          badge: hasDegradedSwitch ? 'FAILOVER' : undefined,
          badgeColor: 'blue',
        },
        {
          href: '/active-channels',
          label: 'Active Channels',
          icon: PhoneCall,
        },
      ],
    },
    {
      title: 'Interactive Sandbox',
      items: [
        {
          href: '/test-runner',
          label: 'Single Case Simulator',
          icon: FlaskConical,
          badge: 'SANDBOX',
          badgeColor: 'slate',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 fixed inset-y-0 left-0 z-30 bg-canvas-raised/80 backdrop-blur-glass border-r border-glass-border flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-glass-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-brand-blue flex items-center justify-center font-bold text-white shadow-blue-glow group-hover:scale-105 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.0001 2L2 19.5H7.5L12.0001 11.5L16.5 19.5H22L12.0001 2Z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-text-primary flex items-center gap-1.5">
                Razorpay
                <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-brand-navy border border-brand-blue/30 text-brand-blue">
                  Recovery
                </span>
              </div>
              <div className="text-[11px] text-text-tertiary font-mono tracking-wider uppercase">
                Autonomous Ops Deck
              </div>
            </div>
          </Link>
        </div>

        {/* Structured Navigation Sections */}
        <nav className="p-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-text-tertiary font-semibold">
                {section.title}
              </div>

              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30 shadow-[0_0_12px_var(--brand-blue-glow)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-glass-bg border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={clsx(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-brand-blue' : 'text-text-tertiary group-hover:text-text-primary'
                        )}
                        strokeWidth={1.75}
                      />
                      <span>{item.label}</span>
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
            </div>
          ))}
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

        {/* Theme & Mode Bar */}
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-text-tertiary">
          <span className="font-mono">v2.0-engine</span>
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
