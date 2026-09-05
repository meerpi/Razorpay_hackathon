'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

interface BatchRunActionProps {
  initialSummary?: any;
  initialBenchmark?: any;
  totalCases?: number;
}

export const BatchRunAction: React.FC<BatchRunActionProps> = ({
  initialSummary,
  initialBenchmark,
  totalCases,
}) => {
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [batchOutputLog, setBatchOutputLog] = useState<string | null>(null);

  const displayCases = totalCases ?? initialSummary?.total_cases ?? 1500;

  const handleRunBatch = async () => {
    setIsExecutingBatch(true);
    setBatchOutputLog(`Executing: python main.py benchmark 42 ...\nLoading ${displayCases.toLocaleString()} failure cases through autonomous policy engine...`);
    try {
      const res = await fetch('/api/engine/run-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42, mode: 'benchmark' }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchOutputLog(data.stdout || 'Batch execution completed successfully.');
        // Refresh page to load updated metrics
        window.location.reload();
      } else {
        setBatchOutputLog(`Error: ${data.error}\n${data.stderr || ''}`);
      }
    } catch (err: any) {
      setBatchOutputLog(`Failed to execute batch: ${err.message}`);
    } finally {
      setIsExecutingBatch(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/queue"
          className="px-3.5 py-1.5 rounded-sm text-xs font-mono font-medium surface-panel border border-border-subtle hover:border-border-default hover:bg-canvas-overlay text-text-primary transition-all flex items-center gap-2 shadow-raised-low"
        >
          <span>View All {displayCases.toLocaleString()} Cases in Queue</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-default" />
        </Link>

        <button
          onClick={handleRunBatch}
          disabled={isExecutingBatch}
          className={clsx(
            'px-3.5 py-1.5 rounded-sm text-xs font-mono font-medium transition-all flex items-center gap-2 shadow-raised-low cursor-pointer',
            isExecutingBatch
              ? 'bg-brand-subtle text-brand-default border border-brand-muted cursor-not-allowed'
              : 'bg-brand-default hover:bg-brand-emphasis text-white border border-brand-emphasis'
          )}
        >
          {isExecutingBatch ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Running Engine Batch...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trigger Batch Evaluation</span>
            </>
          )}
        </button>
      </div>

      {/* Terminal Output Log Drawer */}
      {batchOutputLog && (
        <div className="rounded-md border border-border-subtle bg-canvas-raised p-4 font-mono text-xs shadow-raised-mid">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-3 text-text-tertiary">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-default animate-pulse" />
              Engine Subprocess Stdout (Python 3.12 · main.py)
            </span>
            <button
              onClick={() => setBatchOutputLog(null)}
              className="text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <pre className="text-[11px] text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-brand-subtle">
            {batchOutputLog}
          </pre>
        </div>
      )}
    </div>
  );
};
