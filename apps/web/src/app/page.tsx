'use client';

import { useState } from 'react';
import { BackendStatus } from '@/components/BackendStatus';
import { ToolSelector } from '@/components/ToolSelector';
import { ExecutionResults } from '@/components/ExecutionResults';
import type { InputType, AggregatedReport } from '@tracemesh/shared';

export default function Home() {
  const [report, setReport] = useState<AggregatedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fanOutTarget, setFanOutTarget] = useState<{ value: string; type: InputType } | null>(null);

  const handleRun = async (inputValue: string, inputType: InputType, toolIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/run-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputValue,
          inputType,
          toolIds,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to execute batch query`);
      }

      const data: AggregatedReport = await res.json();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFanOutSearch = (value: string, type: InputType) => {
    setFanOutTarget({ value, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <header className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] uppercase tracking-widest font-mono text-accent-cyan bg-bg-surface border border-accent-cyan-dim/40 rounded shadow-cyan-glow">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          TraceMesh OSINT Command Console
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
          Unified Multi-Domain Intel Aggregator
        </h1>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          One unified input for emails, usernames, phones, domains, IPs, and media. Parallel multi-source execution with automated entity correlation.
        </p>
      </header>

      {/* Main Tool Selector & Search Bar */}
      <ToolSelector
        key={fanOutTarget ? `${fanOutTarget.value}-${fanOutTarget.type}` : 'default'}
        onRun={handleRun}
      />

      {/* Error display */}
      {error && (
        <div className="w-full max-w-3xl p-4 rounded border border-status-error/40 bg-status-error/10 text-left font-mono text-xs text-status-error">
          Execution Error: {error}
        </div>
      )}

      {/* Aggregated Results & Entity Correlation Graph */}
      {(loading || report) && (
        <ExecutionResults
          report={report}
          loading={loading}
          onFanOutSearch={handleFanOutSearch}
        />
      )}

      {/* Telemetry & Subsystem Diagnostics */}
      <div className="w-full max-w-3xl pt-6">
        <BackendStatus />
      </div>
    </main>
  );
}
