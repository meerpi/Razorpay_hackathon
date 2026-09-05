'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  Radio,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { SwitchHealth } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';

const formatMethod = (method: string) => {
  if (!method) return '';
  const m = method.toLowerCase();
  if (m === 'netbanking') return 'Netbanking';
  if (m === 'card') return 'Cards';
  if (m === 'upi') return 'UPI';
  if (m === 'emandate') return 'e-Mandate';
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
};

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
            <Radio className="w-5 h-5 text-brand-default" />
            <span>Switch &amp; Rail Health</span>
          </h1>
          <p className="text-xs font-mono text-text-tertiary mt-1">
            Operational context: Real-time telemetry explaining autonomous routing decisions
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-tertiary">
          Status: <span className="text-positive-emphasis font-semibold">Active Optimizer</span>
        </div>
      </div>

      {/* Grid of Bank Switch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {switches.map((sw) => {
          const isDegraded = sw.isDegraded;
          const isFailingOver = degradedSwitch && sw.railId === 'upi_intent';

          return (
            <GlassCard
              key={sw.railId}
              variant="surface"
              padding="lg"
              className={clsx(
                'space-y-4 relative',
                isDegraded && 'border-attention-muted bg-attention-subtle/20',
                isFailingOver && 'border-brand-muted'
              )}
            >
              {/* Rail Title and Status Ring */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary tracking-tight">
                      {sw.name}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-xs bg-canvas-raised border border-border-subtle text-text-tertiary">
                      {sw.issuer}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                    Instrument: <span className="text-text-secondary font-sans font-medium">{formatMethod(sw.method)}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <span
                  className={clsx(
                    'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs border flex items-center gap-1.5',
                    isDegraded
                      ? 'bg-attention-subtle text-attention-emphasis border-attention-muted'
                      : 'bg-positive-subtle text-positive-emphasis border-positive-muted'
                  )}
                >
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      isDegraded ? 'bg-attention-default' : 'bg-positive-default'
                    )}
                  />
                  {isDegraded ? 'Degraded' : 'Operational'}
                </span>
              </div>

              {/* Success Rate & Latency Readings */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
                <div>
                  <div className="text-[10px] font-mono text-text-tertiary">
                    Success Rate
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      className={clsx(
                        'text-xl font-mono font-semibold tabular-nums',
                        isDegraded ? 'text-negative-emphasis' : 'text-text-primary'
                      )}
                    >
                      {sw.currentSuccessRate}%
                    </span>
                    {isDegraded ? (
                      <span className="text-negative-emphasis text-xs flex items-center">
                        <TrendingDown className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-positive-emphasis text-xs flex items-center">
                        <TrendingUp className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary">
                    Baseline: {sw.baselineSuccessRate}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-text-tertiary">
                    Average Latency
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={clsx(
                        'text-xl font-mono font-semibold tabular-nums',
                        isDegraded ? 'text-attention-emphasis font-bold' : 'text-text-primary'
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
              <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                  <span>Latency Sparkline (Last 10m)</span>
                  <span>Max: {isDegraded ? '9,000ms' : '1,500ms'}</span>
                </div>
                <div className="h-10 flex items-end gap-1.5 bg-canvas/40 p-1 rounded-xs">
                  {sw.latencyHistory.map((item, idx) => {
                    const max = isDegraded ? 9500 : 2000;
                    const pct = Math.min(100, Math.max(15, (item.latency / max) * 100));
                    return (
                      <div
                        key={idx}
                        className={clsx(
                          'flex-1 rounded-t-xs transition-all',
                          isDegraded && idx === sw.latencyHistory.length - 1
                            ? 'bg-attention-default'
                            : 'bg-brand-default/60 hover:bg-brand-default'
                        )}
                        style={{ height: `${pct}%` }}
                        title={`${item.time}: ${item.latency}ms`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Action: Interactive Outage Simulation Toggle */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-tertiary">
                  Simulate Outage:
                </span>
                <button
                  onClick={() => handleToggleDegradation(sw.railId)}
                  className={clsx(
                    'px-2.5 py-1 rounded-xs text-[11px] font-mono font-medium transition-colors border',
                    isDegraded
                      ? 'bg-positive-subtle text-positive-emphasis border-positive-muted hover:bg-positive-muted'
                      : 'bg-negative-subtle text-negative-emphasis border-negative-muted hover:bg-negative-muted'
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
