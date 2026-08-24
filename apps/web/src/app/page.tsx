'use client';

import { useState } from 'react';
import { BackendStatus } from '@/components/BackendStatus';
import { ToolSelector } from '@/components/ToolSelector';
import type { InputType } from '@tracemesh/shared';

export default function Home() {
  const [activeRun, setActiveRun] = useState<{
    inputValue: string;
    inputType: InputType;
    toolIds: string[];
  } | null>(null);

  const handleRun = (inputValue: string, inputType: InputType, toolIds: string[]) => {
    setActiveRun({ inputValue, inputType, toolIds });
    console.log('Initiating parallel OSINT batch run for:', { inputValue, inputType, toolIds });
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
      <ToolSelector onRun={handleRun} />

      {/* Active Run Telemetry Preview */}
      {activeRun && (
        <div className="w-full max-w-3xl border border-accent-cyan bg-bg-surface/90 backdrop-blur-md p-4 rounded shadow-cyan-glow animate-fade-in text-left font-mono text-xs">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-2 mb-3">
            <span className="text-accent-cyan uppercase tracking-wider font-semibold">
              Batch Execution Dispatched
            </span>
            <span className="text-text-muted">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-text-secondary">
            <div>Target: <span className="text-text-primary font-bold">{activeRun.inputValue}</span></div>
            <div>Domain: <span className="text-accent-cyan uppercase">{activeRun.inputType}</span></div>
            <div>Active Runners: <span className="text-status-success">{activeRun.toolIds.length} tools</span></div>
          </div>
        </div>
      )}

      {/* Telemetry & Subsystem Diagnostics */}
      <div className="w-full max-w-3xl pt-6">
        <BackendStatus />
      </div>
    </main>
  );
}
