'use client';

import { useState } from 'react';
import type { AggregatedReport, DiscoveredEntity } from '@tracemesh/shared';
import { GitCompare, X, Shield, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import { soundFx } from '@/lib/soundFx';

interface ComparisonMatrixProps {
  isOpen: boolean;
  onClose: () => void;
  reports: AggregatedReport[];
}

export function ComparisonMatrix({ isOpen, onClose, reports }: ComparisonMatrixProps) {
  const [selectedIdxA, setSelectedIdxA] = useState<number>(0);
  const [selectedIdxB, setSelectedIdxB] = useState<number>(Math.min(1, reports.length - 1));

  if (!isOpen) return null;

  const reportA = reports[selectedIdxA];
  const reportB = reports[selectedIdxB];

  // Calculate intersection / common entities between target A and target B
  const commonEntities: DiscoveredEntity[] = [];
  if (reportA && reportB && reportA !== reportB) {
    const valuesB = new Set(reportB.entities.map((e) => e.value.toLowerCase()));
    reportA.entities.forEach((e) => {
      if (valuesB.has(e.value.toLowerCase())) {
        commonEntities.push(e);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md animate-fade-in font-mono p-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl bg-bg-surface border border-accent-cyan rounded-lg shadow-cyan-glow-heavy z-10 p-6 flex flex-col justify-between max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-accent-cyan" />
              <span className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Multi-Target Cross-Correlation Matrix
              </span>
            </div>

            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {reports.length < 2 ? (
            <div className="py-16 text-center text-xs text-text-muted space-y-2">
              <p>At least 2 past intelligence scans are required to compute target intersection matrix.</p>
              <p className="text-[10px]">Execute another search in the Command Bar to populate comparison data.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Target Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target A */}
                <div className="p-3 bg-bg-surface-raised border border-accent-cyan-dim/40 rounded space-y-2 text-left">
                  <span className="text-[10px] text-accent-cyan font-bold uppercase">Target Alpha:</span>
                  <select
                    value={selectedIdxA}
                    onChange={(e) => {
                      soundFx.playBlip();
                      setSelectedIdxA(Number(e.target.value));
                    }}
                    className="w-full p-2 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs text-text-primary outline-none"
                  >
                    {reports.map((r, i) => (
                      <option key={r.runId || i} value={i}>
                        {r.root.value} ({r.root.type}) - {new Date(r.createdAt || Date.now()).toLocaleTimeString()}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-text-secondary">
                    Entities Found: <strong className="text-text-primary">{reportA?.entities.length}</strong> | Threat:{' '}
                    <strong className="text-accent-amber">{reportA?.threatLevel || 'EVAL'}</strong>
                  </div>
                </div>

                {/* Target B */}
                <div className="p-3 bg-bg-surface-raised border border-accent-cyan-dim/40 rounded space-y-2 text-left">
                  <span className="text-[10px] text-accent-cyan font-bold uppercase">Target Bravo:</span>
                  <select
                    value={selectedIdxB}
                    onChange={(e) => {
                      soundFx.playBlip();
                      setSelectedIdxB(Number(e.target.value));
                    }}
                    className="w-full p-2 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs text-text-primary outline-none"
                  >
                    {reports.map((r, i) => (
                      <option key={r.runId || i} value={i}>
                        {r.root.value} ({r.root.type}) - {new Date(r.createdAt || Date.now()).toLocaleTimeString()}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-text-secondary">
                    Entities Found: <strong className="text-text-primary">{reportB?.entities.length}</strong> | Threat:{' '}
                    <strong className="text-accent-amber">{reportB?.threatLevel || 'EVAL'}</strong>
                  </div>
                </div>
              </div>

              {/* Shared Intersecting Evidence */}
              <div className="p-4 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-accent-cyan-dim/20 pb-2">
                  <span className="text-xs uppercase font-bold text-accent-cyan flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                    <span>Correlated Pivot Intersections ({commonEntities.length})</span>
                  </span>
                  <span className="text-[10px] text-text-muted">Direct evidence overlaps</span>
                </div>

                {commonEntities.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-4 text-center">
                    No direct overlapping entities discovered between these two targets.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {commonEntities.map((e, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-bg-base border border-accent-cyan-dim/40 rounded flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <div className="text-text-primary font-bold truncate">{e.value}</div>
                          <div className="text-[10px] text-text-secondary uppercase">{e.type}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan text-[9px] uppercase">
                          MATCH
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-accent-cyan-dim/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent-cyan text-bg-base font-bold text-xs uppercase rounded hover:bg-cyan-300 transition-all shadow-cyan-glow"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
