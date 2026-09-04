'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
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
        setCbsCountdown(`CBS Blackout in ${hoursLeft}h ${minsLeft}m`);
      }
    }, 1000);

    return () => {
      unsub();
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <header className="h-10 fixed top-0 right-0 left-64 z-20 bg-canvas/90 backdrop-blur-glass border-b border-glass-border px-5 flex items-center justify-between text-xs select-none">
      {/* Rail Health Micro Dots */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-mono text-text-tertiary uppercase tracking-wider">
          Routing Telemetry:
        </span>

        <div className="flex items-center gap-3">
          {switches.map((sw) => (
            <div
              key={sw.railId}
              className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary"
              title={`${sw.name}: ${sw.currentSuccessRate}% SR, ${sw.avgLatencyMs}ms`}
            >
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  sw.isDegraded
                    ? 'bg-human-amber animate-ping'
                    : 'bg-success-teal'
                )}
              />
              <span className={clsx(sw.isDegraded && 'text-human-amber font-semibold')}>
                {sw.issuer}
              </span>
              <span className="text-text-tertiary">({sw.avgLatencyMs}ms)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Windows & System Clock */}
      <div className="flex items-center gap-5">
        {/* RBI Calling Window */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <ShieldCheck
            className={clsx('w-3.5 h-3.5', isRbiActive ? 'text-success-teal' : 'text-danger-crimson')}
          />
          <span className="text-text-tertiary">RBI Window:</span>
          <span className={clsx('font-semibold', isRbiActive ? 'text-success-teal' : 'text-danger-crimson')}>
            {isRbiActive ? 'ACTIVE (08:00–19:00)' : 'CLOSED (OUTREACH PAUSED)'}
          </span>
        </div>

        {/* CBS Blackout Countdown */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary border-l border-glass-border pl-4">
          <Clock className="w-3.5 h-3.5 text-text-secondary" />
          <span>{cbsCountdown}</span>
        </div>

        {/* Current Time Clock */}
        <div className="font-mono text-[11px] text-text-primary tabular-nums font-semibold bg-canvas-raised/80 px-2 py-0.5 rounded border border-glass-border">
          {timeString || '14:28:10 IST'}
        </div>
      </div>
    </header>
  );
};
