'use client';

import React from 'react';
import type { KillChainAssessment, KillChainPhaseAssessment } from '@tracemesh/shared';
import { ShieldAlert, Activity, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface KillChainRadarProps {
  assessment: KillChainAssessment;
}

export const KillChainRadar: React.FC<KillChainRadarProps> = ({ assessment }) => {
  if (!assessment || !assessment.phases) return null;

  const { progressionScore, phases, threatAdvisory, activeStagesCount } = assessment;

  const scoreColor =
    progressionScore >= 75
      ? 'text-status-error border-status-error/50 bg-status-error/15'
      : progressionScore >= 40
      ? 'text-accent-amber border-accent-amber/50 bg-accent-amber/15'
      : 'text-accent-cyan border-accent-cyan/50 bg-accent-cyan/15';

  return (
    <div className="bg-slate-950/90 border border-accent-cyan-dim/40 rounded-xl p-5 shadow-[0_0_35px_rgba(0,240,255,0.12)] mb-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent-cyan-dim/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-cyan animate-pulse" />
          <h3 className="font-bold text-accent-cyan text-sm tracking-wider uppercase">
            LOCKHEED MARTIN CYBER KILL CHAIN &reg; RADAR
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${scoreColor}`}>
            KILL-CHAIN PROGRESSION: {progressionScore}%
          </span>
          <span className="px-2 py-0.5 bg-bg-surface-raised border border-accent-cyan-dim/30 text-text-muted rounded text-[10px]">
            {activeStagesCount}/7 STAGES ACTIVE
          </span>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-3 bg-bg-surface-raised/80 border border-accent-cyan-dim/20 rounded mb-4 text-[11px] text-text-secondary flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
        <span className="leading-relaxed">{threatAdvisory}</span>
      </div>

      {/* 7-Stage Visual Step Progression Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        {phases.map((phase: KillChainPhaseAssessment, idx: number) => {
          const isDetected = phase.status === 'DETECTED';
          const isSuspected = phase.status === 'SUSPECTED';

          const cardBorder = isDetected
            ? 'border-status-error/60 bg-status-error/10 text-status-error shadow-[0_0_15px_rgba(239,68,68,0.15)]'
            : isSuspected
            ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber'
            : 'border-slate-800 bg-slate-900/50 text-text-muted';

          return (
            <div
              key={phase.stage}
              className={`p-2.5 rounded border transition-all flex flex-col justify-between space-y-1.5 ${cardBorder}`}
            >
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-bold opacity-70">0{idx + 1}</span>
                {isDetected ? (
                  <span className="px-1 py-0.2 rounded bg-status-error text-bg-base font-bold text-[8px]">
                    ACTIVE
                  </span>
                ) : isSuspected ? (
                  <span className="px-1 py-0.2 rounded bg-accent-amber text-bg-base font-bold text-[8px]">
                    SUSPECT
                  </span>
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-slate-600" />
                )}
              </div>

              <div className="text-[11px] font-bold text-text-primary uppercase truncate" title={phase.name}>
                {phase.name}
              </div>

              <div className="text-[9px] opacity-80 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>IOCs: {phase.iocCount}</span>
                <span>{Math.round(phase.confidence * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Phase Key Indicators */}
      {phases.some((p) => p.indicators && p.indicators.length > 0) && (
        <div className="pt-3 border-t border-accent-cyan-dim/15 space-y-2">
          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
            Correlated Stage Telemetry &amp; IOC Markers
          </span>
          <div className="flex flex-wrap gap-1.5">
            {phases
              .filter((p) => p.status !== 'CLEAN' && p.indicators?.length)
              .flatMap((p) =>
                p.indicators.map((ind, i) => (
                  <div
                    key={`${p.stage}-${i}`}
                    className="px-2 py-0.5 rounded bg-bg-base/90 border border-accent-cyan-dim/30 text-[10px] text-text-secondary flex items-center gap-1.5 font-mono"
                  >
                    <span className="text-accent-cyan uppercase font-bold text-[8px]">{p.name}:</span>
                    <span className="truncate max-w-[220px] text-text-primary">{ind}</span>
                  </div>
                )),
              )}
          </div>
        </div>
      )}
    </div>
  );
};
