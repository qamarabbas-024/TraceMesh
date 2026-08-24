'use client';

import { useState } from 'react';
import type { AggregatedReport, DiscoveredEntity } from '@tracemesh/shared';
import { GitCompare, X, Sparkles, Check, ArrowRight, Layers } from 'lucide-react';

interface CompareRunsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportA: AggregatedReport | null;
  reportB: AggregatedReport | null;
}

export function CompareRunsModal({
  isOpen,
  onClose,
  reportA,
  reportB,
}: CompareRunsModalProps) {
  if (!isOpen || !reportA || !reportB) return null;

  // Compute common and unique entities
  const mapA = new Map(reportA.entities.map((e) => [e.value.toLowerCase().trim(), e]));
  const mapB = new Map(reportB.entities.map((e) => [e.value.toLowerCase().trim(), e]));

  const commonEntities: DiscoveredEntity[] = [];
  const onlyAEntities: DiscoveredEntity[] = [];
  const onlyBEntities: DiscoveredEntity[] = [];

  for (const [val, entity] of mapA.entries()) {
    if (mapB.has(val)) {
      commonEntities.push(entity);
    } else {
      onlyAEntities.push(entity);
    }
  }

  for (const [val, entity] of mapB.entries()) {
    if (!mapA.has(val)) {
      onlyBEntities.push(entity);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-4xl max-h-[85vh] bg-bg-surface border border-accent-cyan-dim/40 rounded p-6 shadow-cyan-glow flex flex-col justify-between overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/25 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-sm font-mono uppercase tracking-widest text-accent-cyan font-bold">
              Multi-Domain Batch Correlation & Cross-Comparison
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Targets comparison banner */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
          <div className="p-3 bg-bg-surface-raised/70 border border-accent-cyan-dim/30 rounded">
            <div className="text-[10px] text-text-muted uppercase">Target Subject A</div>
            <div className="text-sm font-bold text-accent-cyan truncate">{reportA.root.value}</div>
            <div className="text-[11px] text-text-secondary">
              {reportA.entities.length} Nodes • {reportA.root.type.toUpperCase()}
            </div>
          </div>

          <div className="p-3 bg-bg-surface-raised/70 border border-accent-cyan-dim/30 rounded">
            <div className="text-[10px] text-text-muted uppercase">Target Subject B</div>
            <div className="text-sm font-bold text-accent-amber truncate">{reportB.root.value}</div>
            <div className="text-[11px] text-text-secondary">
              {reportB.entities.length} Nodes • {reportB.root.type.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Comparison Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Common Linked Nodes */}
          <div className="p-4 bg-bg-surface-raised/50 border border-status-success/40 rounded space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-status-success font-semibold uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Correlated Intersecting Entities ({commonEntities.length})</span>
            </div>

            {commonEntities.length === 0 ? (
              <div className="text-xs font-mono text-text-muted">
                No overlapping entity footprints detected between subjects.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {commonEntities.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-bg-base/80 border border-status-success/30 rounded flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="text-text-primary font-semibold">{e.value}</span>
                      <span className="text-[11px] text-text-muted ml-2">({e.label})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-status-success/15 text-status-success uppercase font-semibold">
                      Matched
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unique Entities Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Unique to A */}
            <div className="p-3 bg-bg-surface-raised/30 border border-accent-cyan-dim/20 rounded space-y-2">
              <div className="text-[11px] text-accent-cyan uppercase font-semibold">
                Unique to {reportA.root.value} ({onlyAEntities.length})
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {onlyAEntities.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-bg-base/50 border border-accent-cyan-dim/20 rounded truncate"
                  >
                    <div className="text-text-primary truncate">{e.value}</div>
                    <div className="text-[10px] text-text-muted truncate">{e.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique to B */}
            <div className="p-3 bg-bg-surface-raised/30 border border-accent-amber/20 rounded space-y-2">
              <div className="text-[11px] text-accent-amber uppercase font-semibold">
                Unique to {reportB.root.value} ({onlyBEntities.length})
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {onlyBEntities.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-bg-base/50 border border-accent-amber/20 rounded truncate"
                  >
                    <div className="text-text-primary truncate">{e.value}</div>
                    <div className="text-[10px] text-text-muted truncate">{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-accent-cyan-dim/20 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Automated Cross-Domain Graph Diffing Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-accent-cyan text-bg-base font-semibold rounded hover:bg-cyan-300 transition-colors"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
}
