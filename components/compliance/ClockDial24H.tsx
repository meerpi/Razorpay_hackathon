'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Clock } from 'lucide-react';

export const ClockDial24H: React.FC = () => {
  const [nowIST, setNowIST] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      setNowIST(new Date(utc + 3600000 * 5.5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = nowIST.getHours();
  const minutes = nowIST.getMinutes();
  const totalHoursFloat = hours + minutes / 60;

  // 24 hours = 360 degrees. 0h = 0 deg (top), 6h = 90 deg, 12h = 180 deg, 18h = 270 deg.
  const currentAngleDeg = (totalHoursFloat / 24) * 360;

  // RBI Window: 8:00 (120 deg) to 19:00 (285 deg)
  // CBS Window: 23:30 (352.5 deg) to 3:30 (52.5 deg)

  const isRbiActive = hours >= 8 && hours < 19;
  const isCbsActive = hours < 3 || (hours === 3 && minutes < 30) || (hours === 23 && minutes >= 30);

  // SVG parameters
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;

  // Polar to Cartesian conversion
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // RBI Arc: 8h to 19h = (8/24)*360 to (19/24)*360 = 120deg to 285deg (delta = 165deg)
  const rbiPath = describeArc(cx, cy, radius, 120, 285);

  // CBS Arc: 23.5h to 24h (352.5 to 360) and 0h to 3.5h (0 to 52.5) -> delta = 60 deg across midnight
  // In SVG, we can draw 352.5 to 412.5 mod 360
  const cbsPath = describeArc(cx, cy, radius, 352.5, 360 + 52.5);

  // Needle tip
  const needleTip = polarToCartesian(cx, cy, radius - 15, currentAngleDeg);

  return (
    <div className="flex flex-col items-center justify-center p-5 rounded-xl glass-panel relative select-none">
      <div className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-brand-blue" />
        <span>24-Hour Statutory Dial (IST)</span>
      </div>

      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Base dial track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="10"
          />

          {/* RBI Calling Window Arc: 08:00 - 19:00 IST */}
          <path
            d={rbiPath}
            fill="none"
            stroke="var(--success-teal)"
            strokeWidth="10"
            strokeLinecap="round"
            className="opacity-80"
          />

          {/* CBS Nocturnal Maintenance Blackout Arc: 23:30 - 03:30 IST */}
          <path
            d={cbsPath}
            fill="none"
            stroke="var(--danger-crimson)"
            strokeWidth="10"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Hour markers & labels */}
          {[0, 3, 6, 8, 12, 15, 19, 21, 23.5].map((hourVal, idx) => {
            const angle = (hourVal / 24) * 360;
            const ptOuter = polarToCartesian(cx, cy, radius + 10, angle);
            const ptText = polarToCartesian(cx, cy, radius + 22, angle);

            let label = `${hourVal}h`;
            if (hourVal === 23.5) label = '23:30';
            if (hourVal === 0) label = '00:00';

            return (
              <g key={idx}>
                <circle cx={ptOuter.x} cy={ptOuter.y} r="1.5" fill="rgba(255,255,255,0.3)" />
                <text
                  x={ptText.x}
                  y={ptText.y + 3}
                  textAnchor="middle"
                  fill="var(--text-tertiary)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Moving Current-Time Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--brand-blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill="var(--brand-blue)" />
          <circle cx={needleTip.x} cy={needleTip.y} r="4" fill="var(--brand-blue)" className="animate-ping" />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-mono font-bold text-text-primary tabular-nums">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-mono text-text-tertiary uppercase">IST</span>
          <span
            className={clsx(
              'mt-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold',
              isRbiActive
                ? 'bg-success-teal/20 text-success-teal border border-success-teal/40'
                : 'bg-neutral-slate/20 text-text-tertiary'
            )}
          >
            {isRbiActive ? 'RBI Outreach Open' : 'Outreach Paused'}
          </span>
        </div>
      </div>

      {/* Legend below dial */}
      <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-text-secondary">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-teal" />
          <span>RBI Window (08:00–19:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-crimson" />
          <span>CBS Blackout (23:30–03:30)</span>
        </div>
      </div>
    </div>
  );
};
