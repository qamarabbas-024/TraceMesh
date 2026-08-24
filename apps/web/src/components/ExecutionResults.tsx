'use client';

import type { AggregatedReport, DiscoveredEntity, InputType } from '@tracemesh/shared';
import {
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Hash,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface ExecutionResultsProps {
  report: AggregatedReport | null;
  loading: boolean;
  onFanOutSearch: (value: string, type: InputType) => void;
}

// Source-tool color mapping per DESIGN.md Section 6
const TOOL_COLORS: Record<string, { badge: string; border: string; text: string }> = {
  sherlock: {
    badge: 'bg-[#818cf8]/15 border-[#818cf8]/60 text-[#818cf8]',
    border: 'border-[#818cf8]/40',
    text: 'text-[#818cf8]',
  },
  holehe: {
    badge: 'bg-[#34d399]/15 border-[#34d399]/60 text-[#34d399]',
    border: 'border-[#34d399]/40',
    text: 'text-[#34d399]',
  },
  exiftool: {
    badge: 'bg-[#fb923c]/15 border-[#fb923c]/60 text-[#fb923c]',
    border: 'border-[#fb923c]/40',
    text: 'text-[#fb923c]',
  },
};

export function ExecutionResults({ report, loading, onFanOutSearch }: ExecutionResultsProps) {
  if (loading) {
    return (
      <div className="w-full max-w-3xl border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-8 rounded text-center shadow-cyan-glow">
        <div className="inline-block w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-mono text-text-primary uppercase tracking-widest font-semibold mb-1">
          Executing Parallel Intelligence Scan
        </div>
        <p className="text-xs font-mono text-text-secondary">
          Dispatching multi-domain workers across selected tool registry endpoints...
        </p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="w-full max-w-3xl space-y-6 text-left">
      {/* HUD Telemetry Stats Banner */}
      <div className="border border-accent-cyan bg-bg-surface/90 backdrop-blur-md p-4 rounded shadow-cyan-glow">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent-cyan-dim/25 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-mono font-semibold text-accent-cyan">
              Intelligence Graph // {report.root.value}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              {report.stats.durationMs}ms
            </span>
            {report.stats.cached && (
              <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40">
                CACHED
              </span>
            )}
          </div>
        </div>

        {/* Stats Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-bg-surface-raised/60 border border-accent-cyan-dim/20 rounded">
            <div className="text-[10px] text-text-muted uppercase">Target Entity</div>
            <div className="text-sm text-text-primary font-bold truncate" title={report.root.value}>
              {report.root.value}
            </div>
          </div>

          <div className="p-2.5 bg-bg-surface-raised/60 border border-accent-cyan-dim/20 rounded">
            <div className="text-[10px] text-text-muted uppercase">Discovered Nodes</div>
            <div className="text-sm text-status-success font-bold">
              {report.entities.length} Nodes
            </div>
          </div>

          <div className="p-2.5 bg-bg-surface-raised/60 border border-accent-cyan-dim/20 rounded">
            <div className="text-[10px] text-text-muted uppercase">Modules Executed</div>
            <div className="text-sm text-text-primary font-bold">
              {report.stats.successCount} / {report.stats.totalTools} Active
            </div>
          </div>

          <div className="p-2.5 bg-bg-surface-raised/60 border border-accent-cyan-dim/20 rounded">
            <div className="text-[10px] text-text-muted uppercase">Target Domain</div>
            <div className="text-sm text-accent-cyan font-bold uppercase">
              {report.root.type}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Entities Correlation Stream */}
      <div className="border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-5 rounded space-y-4">
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/20 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs uppercase tracking-wider font-mono text-accent-cyan font-semibold">
              Correlated Entity Nodes ({report.entities.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            Click any node to fan out new search
          </span>
        </div>

        {report.entities.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-text-muted">
            No linked entities discovered for this target identifier.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {report.entities.map((entity, idx) => {
              const toolStyle = TOOL_COLORS[entity.sourceTool.toLowerCase()] || {
                badge: 'bg-accent-cyan/15 border-accent-cyan/60 text-accent-cyan',
                border: 'border-accent-cyan-dim/30',
                text: 'text-accent-cyan',
              };

              const canFanOut =
                entity.type === 'email' ||
                entity.type === 'username' ||
                entity.type === 'phone' ||
                entity.type === 'domain' ||
                entity.type === 'ip';

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded bg-bg-surface-raised/50 border border-accent-cyan-dim/20 hover:border-accent-cyan-dim transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      {/* Source Tool Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${toolStyle.badge}`}
                      >
                        {entity.sourceTool}
                      </span>

                      {/* Entity Type Badge */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-text-secondary uppercase">
                        {entity.type}
                      </span>

                      {entity.confidence !== undefined && (
                        <span className="text-[10px] font-mono text-text-muted">
                          {Math.round(entity.confidence * 100)}% conf
                        </span>
                      )}
                    </div>

                    {/* Value & Label */}
                    <div className="text-xs font-mono text-text-primary font-medium truncate">
                      {entity.value}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {entity.label}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {entity.value.startsWith('http') && (
                      <a
                        href={entity.value}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-bg-base border border-accent-cyan-dim/30 text-text-secondary hover:text-accent-cyan rounded transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {canFanOut && (
                      <button
                        onClick={() => onFanOutSearch(entity.value, entity.type as InputType)}
                        className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono bg-accent-cyan/15 border border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg-base rounded transition-all font-semibold"
                        title="Fan out intelligence query on this entity"
                      >
                        <span>Fan Out</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Module Execution Logs & Diagnostics */}
      <div className="border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-5 rounded space-y-3">
        <div className="flex items-center gap-2 border-b border-accent-cyan-dim/20 pb-2">
          <Layers className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs uppercase tracking-wider font-mono text-accent-cyan font-semibold">
            Module Telemetry & Diagnostic Breakdown
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {report.toolResults.map((result) => (
            <div
              key={result.toolId}
              className="p-3 rounded bg-bg-surface-raised/40 border border-accent-cyan-dim/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                {result.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-status-error shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-text-primary">{result.displayName}</span>
                  <span className="text-text-muted text-[11px] ml-2">({result.durationMs}ms)</span>
                </div>
              </div>

              <div className="text-[11px] text-text-secondary">
                {result.summary || result.error}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
