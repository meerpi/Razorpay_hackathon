'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { ShieldCheck, Clock, AlertTriangle, Radio } from 'lucide-react';
import { dataStore } from '@/lib/mock-data';
import { SwitchHealth } from '@/lib/types';

export const AmbientStatusStrip: React.FC = () => {
  const [switches, setSwitches] = useState<SwitchHealth[]>([]);
  const [timeString, setTimeString] = useState<string>('');
  const [isRbiActive, setIsRbiActive] = useState<boolean>(true);
  const [cbsCountdown, setCbsCountdown] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setSwitches(dataStore.getSwitches());
    };
    update();
    const unsub = dataStore.subscribe(update);

    const clockInterval = setInterval(() => {
      const now = new Date();
      // IST time
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);

      const h = istTime.getHours();
      const m = istTime.getMinutes();
      const s = istTime.getSeconds();

      setTimeString(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} IST`
      );

      // RBI Calling window: 08:00 to 19:00 IST
      setIsRbiActive(h >= 8 && h < 19);

      // CBS Blackout window: 23:30 to 03:30 IST
      let targetH = 23;
      let targetM = 30;
      let diffMinutes = 0;

      if (h < 3 || (h === 3 && m < 30) || (h === 23 && m >= 30)) {
        setCbsCountdown('CBS Blackout ACTIVE');
      } else {
        const currentTotalMinutes = h * 60 + m;
        const targetTotalMinutes = targetH * 60 + targetM;
        diffMinutes = targetTotalMinutes - currentTotalMinutes;
        const hoursLeft = Math.floor(diffMinutes / 60);
        const minsLeft = diffMinutes % 60;
        setCbsCountdown(`CBS in ${hoursLeft}h ${minsLeft}m`);
      }
    }, 1000);

    return () => {
      unsub();
      clearInterval(clockInterval);
    };
  }, []);

  const degradedSwitch = switches.find((s) => s.isDegraded);
  const healthyCount = switches.filter((s) => !s.isDegraded).length;
  const totalSwitches = switches.length || 5;

  return (
    <header className="h-10 fixed top-0 right-0 left-64 z-20 bg-canvas/90 backdrop-blur-md border-b border-glass-border px-5 flex items-center justify-between text-xs select-none">
      {/* Left: Exception-Driven Switch Health Pill */}
      <Link
        href="/switch-health"
        className={clsx(
          'flex items-center gap-2 px-2.5 py-1 rounded-md font-mono text-[11px] transition-all group border',
          degradedSwitch
            ? 'bg-human-amber/10 border-human-amber/40 text-human-amber hover:bg-human-amber/15 shadow-[0_0_8px_var(--human-amber-glow)]'
            : 'glass-panel border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass-bg'
        )}
        title="Click to view bank switch telemetry and failover visualizer"
      >
        <span
          className={clsx(
            'w-2 h-2 rounded-full',
            degradedSwitch ? 'bg-human-amber animate-ping' : 'bg-success-teal'
          )}
        />
        {degradedSwitch ? (
          <span className="flex items-center gap-1.5 font-medium">
            <span>Switches: {healthyCount}/{totalSwitches} Healthy</span>
            <span className="text-text-tertiary">·</span>
            <span className="font-semibold text-human-amber">
              ⚠ {degradedSwitch.issuer} Rerouted ({degradedSwitch.avgLatencyMs}ms)
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="text-text-primary font-medium">Switches: All {totalSwitches} Operational</span>
            <span className="text-text-tertiary">(940ms avg)</span>
          </span>
        )}
      </Link>

      {/* Right: Compliance Windows & Tabular Clock */}
      <div className="flex items-center gap-3">
        {/* RBI Calling Window Token */}
        <Link
          href="/compliance"
          className={clsx(
            'flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] border transition-all',
            isRbiActive
              ? 'bg-success-teal/10 border-success-teal/30 text-success-teal'
              : 'bg-danger-crimson/10 border-danger-crimson/30 text-danger-crimson'
          )}
          title="RBI Digital Lending Outreach Window (08:00–19:00 IST)"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">
            {isRbiActive ? 'RBI: OPEN' : 'RBI: PAUSED'}
          </span>
        </Link>

        {/* CBS Maintenance Countdown Token */}
        <Link
          href="/compliance"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] text-text-tertiary border border-glass-border glass-panel hover:text-text-primary transition-colors"
          title="Core Banking System (CBS) Nocturnal Maintenance Blackout (23:30–03:30 IST)"
        >
          <Clock className="w-3.5 h-3.5 text-text-secondary" />
          <span>{cbsCountdown || 'CBS: 23:30–03:30'}</span>
        </Link>

        {/* Current Time Clock */}
        <div className="font-mono text-[11px] text-text-primary tabular-nums font-semibold bg-canvas-raised px-2 py-0.5 rounded border border-glass-border">
          {timeString || '18:30:00 IST'}
        </div>
      </div>
    </header>
  );
};
