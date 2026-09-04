'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  Radio,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { SwitchHealth } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';

export default function SwitchHealthPage() {
  const [switches, setSwitches] = useState<SwitchHealth[]>([]);

  useEffect(() => {
    const update = () => {
      setSwitches([...dataStore.getSwitches()]);
    };
    update();
    const unsub = dataStore.subscribe(update);
    return () => unsub();
  }, []);

  const handleToggleDegradation = (railId: string) => {
    dataStore.toggleSwitchDegradation(railId);
  };

  const degradedSwitch = switches.find((s) => s.isDegraded);

  return (
    <div className="space-y-6">
      {/* Header with Operational Rationale */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Radio className="w-5 h-5 text-brand-blue" />
            <span>Switch &amp; Rail Health</span>
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-1">
            Operational context: Real-time telemetry explaining autonomous routing decisions
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-tertiary">
          Status: <span className="text-success-teal font-semibold">Active Optimizer</span>
        </div>
      </div>

      {/* Dynamic Failover Flow Banner (when degradation detected) */}
      {degradedSwitch && (
        <div className="relative p-4 rounded-xl glass-panel border border-brand-blue/40 bg-brand-blue/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-human-amber/20 text-human-amber border border-human-amber/40 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-human-amber flex items-center gap-1.5">
                  <span>AUTONOMOUS FAILOVER IN PROGRESS</span>
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {degradedSwitch.name} latency spiked to{' '}
                  <span className="font-mono font-bold text-human-amber">
                    {degradedSwitch.avgLatencyMs}ms
                  </span>{' '}
                  (Success Rate dropped to {degradedSwitch.currentSuccessRate}%).
                </div>
              </div>
            </div>

            {/* Visual Route Flow Indicator */}
            <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg bg-canvas border border-glass-border">
              <span className="text-danger-crimson line-through font-medium">
                {degradedSwitch.issuer} Netbanking
              </span>
              <div className="flex items-center gap-1 text-brand-blue">
                <span className="w-4 h-[1px] bg-brand-blue" />
                <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <span className="text-success-teal font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-brand-blue" />
                <span>UPI Intent (Auto-Reroute)</span>
              </span>
            </div>
          </div>

          {/* Animated flowing dotted line representing failover pipeline */}
          <div className="mt-3 pt-2 border-t border-glass-border/40 flex items-center gap-2 text-[11px] font-mono text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
            <span>Telemetry rule fired: dynamic_switch_rerouting_degradation_bypass (Lift expectation: +62%)</span>
          </div>
        </div>
      )}

      {/* Grid of Bank Switch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {switches.map((sw) => {
          const isDegraded = sw.isDegraded;
          const isFailingOver = degradedSwitch && sw.railId === 'upi_intent';

          return (
            <GlassCard
              key={sw.railId}
              variant={isDegraded ? 'amber' : isFailingOver ? 'blue' : 'default'}
              padding="lg"
              className={clsx('space-y-4 relative')}
            >
              {/* Rail Title and Status Ring */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary tracking-tight">
                      {sw.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-canvas-raised border border-glass-border text-text-tertiary">
                      {sw.issuer}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                    Instrument: <span className="uppercase text-text-secondary">{sw.method}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <span
                  className={clsx(
                    'text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border flex items-center gap-1.5',
                    isDegraded
                      ? 'bg-human-amber/20 text-human-amber border-human-amber/40 shadow-[0_0_10px_var(--human-amber-glow)]'
                      : 'bg-success-teal/15 text-success-teal border-success-teal/30'
                  )}
                >
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      isDegraded ? 'bg-human-amber animate-ping' : 'bg-success-teal'
                    )}
                  />
                  {sw.status}
                </span>
              </div>

              {/* Success Rate & Latency Readings */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-glass-border">
                <div>
                  <div className="text-[10px] font-mono text-text-tertiary uppercase">
                    Success Rate
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      className={clsx(
                        'text-xl font-mono font-semibold tabular-nums',
                        isDegraded ? 'text-danger-crimson' : 'text-text-primary'
                      )}
                    >
                      {sw.currentSuccessRate}%
                    </span>
                    {isDegraded ? (
                      <span className="text-danger-crimson text-xs flex items-center">
                        <TrendingDown className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-success-teal text-xs flex items-center">
                        <TrendingUp className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary">
                    Baseline: {sw.baselineSuccessRate}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-text-tertiary uppercase">
                    Average Latency
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={clsx(
                        'text-xl font-mono font-semibold tabular-nums',
                        isDegraded ? 'text-human-amber font-bold' : 'text-text-primary'
                      )}
                    >
                      {sw.avgLatencyMs}
                    </span>
                    <span className="text-xs font-mono text-text-tertiary">ms</span>
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary">
                    {isDegraded ? 'High latency spike' : 'Nominal switch state'}
                  </div>
                </div>
              </div>

              {/* Latency History Sparkline */}
              <div className="space-y-1.5 pt-2 border-t border-glass-border">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                  <span>Latency Sparkline (Last 10m)</span>
                  <span>Max: {isDegraded ? '9,000ms' : '1,500ms'}</span>
                </div>
                <div className="h-10 flex items-end gap-1.5 bg-canvas/40 p-1 rounded">
                  {sw.latencyHistory.map((item, idx) => {
                    const max = isDegraded ? 9500 : 2000;
                    const pct = Math.min(100, Math.max(15, (item.latency / max) * 100));
                    return (
                      <div
                        key={idx}
                        className={clsx(
                          'flex-1 rounded-t transition-all',
                          isDegraded && idx === sw.latencyHistory.length - 1
                            ? 'bg-human-amber shadow-[0_0_8px_var(--human-amber-glow)]'
                            : 'bg-brand-blue/60 hover:bg-brand-blue'
                        )}
                        style={{ height: `${pct}%` }}
                        title={`${item.time}: ${item.latency}ms`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Action: Interactive Outage Simulation Toggle */}
              <div className="pt-2 border-t border-glass-border flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-tertiary">
                  Simulate Outage:
                </span>
                <button
                  onClick={() => handleToggleDegradation(sw.railId)}
                  className={clsx(
                    'px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors border',
                    isDegraded
                      ? 'bg-success-teal/15 text-success-teal border-success-teal/40 hover:bg-success-teal/25'
                      : 'bg-danger-crimson/15 text-danger-crimson border-danger-crimson/30 hover:bg-danger-crimson/25'
                  )}
                >
                  {isDegraded ? 'Restore Switch Health' : 'Trigger Degradation'}
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
