'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

interface BatchRunActionProps {
  initialSummary?: any;
  initialBenchmark?: any;
}

export const BatchRunAction: React.FC<BatchRunActionProps> = () => {
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [batchOutputLog, setBatchOutputLog] = useState<string | null>(null);

  const handleRunBatch = async () => {
    setIsExecutingBatch(true);
    setBatchOutputLog('Executing: python main.py benchmark 42 ...\nLoading 1,500 failure cases through autonomous policy engine...');
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
          className="px-4 py-2 rounded-lg text-xs font-mono font-medium glass-panel border border-glass-border hover:bg-glass-bg-hover hover:border-brand-blue/40 text-text-primary transition-all flex items-center gap-2 shadow-sm"
        >
          <span>View All 1,500 Cases in Queue</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-blue" />
        </Link>

        <button
          onClick={handleRunBatch}
          disabled={isExecutingBatch}
          className={clsx(
            'px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer',
            isExecutingBatch
              ? 'bg-brand-blue/50 text-white cursor-not-allowed'
              : 'bg-brand-blue hover:bg-brand-blue/90 text-white shadow-blue-glow'
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
        <div className="rounded-xl border border-glass-border bg-canvas-raised p-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-3 text-text-tertiary">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
              Engine Subprocess Stdout (Python 3.12 · main.py)
            </span>
            <button
              onClick={() => setBatchOutputLog(null)}
              className="text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <pre className="text-[11px] text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-brand-blue/30">
            {batchOutputLog}
          </pre>
        </div>
      )}
    </div>
  );
};
