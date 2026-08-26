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
  ShieldAlert,
  ShieldCheck,
  Flame,
} from 'lucide-react';

import { useState, useEffect, useRef } from 'react';
import { RadialGauge } from '@/components/RadialGauge';
import { EntityInspectorDrawer } from '@/components/EntityInspectorDrawer';
import { soundFx } from '@/lib/soundFx';
import { animate, stagger } from 'animejs';

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
  maigret: {
    badge: 'bg-[#a78bfa]/15 border-[#a78bfa]/60 text-[#a78bfa]',
    border: 'border-[#a78bfa]/40',
    text: 'text-[#a78bfa]',
  },
  ghunt: {
    badge: 'bg-[#38bdf8]/15 border-[#38bdf8]/60 text-[#38bdf8]',
    border: 'border-[#38bdf8]/40',
    text: 'text-[#38bdf8]',
  },
  h8mail: {
    badge: 'bg-[#f43f5e]/15 border-[#f43f5e]/60 text-[#f43f5e]',
    border: 'border-[#f43f5e]/40',
    text: 'text-[#f43f5e]',
  },
  subfinder: {
    badge: 'bg-[#06b6d4]/15 border-[#06b6d4]/60 text-[#06b6d4]',
    border: 'border-[#06b6d4]/40',
    text: 'text-[#06b6d4]',
  },
  spiderfoot: {
    badge: 'bg-[#eab308]/15 border-[#eab308]/60 text-[#eab308]',
    border: 'border-[#eab308]/40',
    text: 'text-[#eab308]',
  },
  theharvester: {
    badge: 'bg-[#10b981]/15 border-[#10b981]/60 text-[#10b981]',
    border: 'border-[#10b981]/40',
    text: 'text-[#10b981]',
  },
  censys: {
    badge: 'bg-[#6366f1]/15 border-[#6366f1]/60 text-[#6366f1]',
    border: 'border-[#6366f1]/40',
    text: 'text-[#6366f1]',
  },
  ahmia: {
    badge: 'bg-[#ec4899]/15 border-[#ec4899]/60 text-[#ec4899]',
    border: 'border-[#ec4899]/40',
    text: 'text-[#ec4899]',
  },
  phoneinfoga: {
    badge: 'bg-[#38bdf8]/15 border-[#38bdf8]/60 text-[#38bdf8]',
    border: 'border-[#38bdf8]/40',
    text: 'text-[#38bdf8]',
  },
  domainrecon: {
    badge: 'bg-[#22d3ee]/15 border-[#22d3ee]/60 text-[#22d3ee]',
    border: 'border-[#22d3ee]/40',
    text: 'text-[#22d3ee]',
  },
};

export function ExecutionResults({ report, loading, onFanOutSearch }: ExecutionResultsProps) {
  const [inspectedEntity, setInspectedEntity] = useState<DiscoveredEntity | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (gridRef.current && report?.entities && report.entities.length > 0) {
      try {
        animate(gridRef.current.querySelectorAll('.entity-card'), {
          opacity: [0, 1],
          translateY: [14, 0],
          scale: [0.96, 1],
          delay: stagger(45, { start: 80 }),
          ease: 'outCubic',
          duration: 500,
        });
      } catch {}
    }
  }, [report]);

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

  const threatColor =
    report.threatLevel === 'CRITICAL'
      ? 'text-status-error border-status-error/60 bg-status-error/15'
      : report.threatLevel === 'HIGH'
      ? 'text-accent-amber border-accent-amber/60 bg-accent-amber/15'
      : report.threatLevel === 'MEDIUM'
      ? 'text-yellow-400 border-yellow-400/60 bg-yellow-400/15'
      : 'text-status-success border-status-success/60 bg-status-success/15';

  return (
    <div className="w-full max-w-3xl space-y-6 text-left">
      {/* HUD Telemetry Stats & OPSEC Threat Banner */}
      <div className="border border-accent-cyan bg-bg-surface/90 backdrop-blur-md p-4 rounded shadow-cyan-glow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent-cyan-dim/25 pb-3">
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
            <div className="flex flex-wrap items-center gap-1.5 ml-2">
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportCSV(report))}
                className="px-2 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors text-[10px]"
                title="Export as CSV table"
              >
                CSV
              </button>
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportJSON(report))}
                className="px-2 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors text-[10px]"
                title="Export as raw JSON dossier"
              >
                JSON
              </button>
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportSTIX2(report))}
                className="px-2 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors text-[10px]"
                title="Export as STIX 2.1 Cyber Threat Intel Bundle"
              >
                STIX 2.1
              </button>
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportMISP(report))}
                className="px-2 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors text-[10px]"
                title="Export as MISP Event JSON"
              >
                MISP
              </button>
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportMaltego(report))}
                className="px-2 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors text-[10px]"
                title="Export as Maltego Graph Transform CSV"
              >
                Maltego
              </button>
              <button
                onClick={() => import('@/lib/export').then((m) => m.exportReportPDF(report))}
                className="px-2.5 py-1 bg-accent-cyan/15 border border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg-base font-semibold rounded transition-all text-[10px]"
                title="Export Dossier as PDF"
              >
                PDF Dossier
              </button>
            </div>
          </div>
        </div>

        {/* OPSEC Score & Threat Level Matrix with Radial Telemetry Gauge */}
        {report.opsecScore !== undefined && (
          <div className="p-3.5 bg-bg-surface-raised/70 border border-accent-cyan-dim/25 rounded flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent-amber" />
                <span className="text-xs font-mono uppercase font-bold text-text-primary">
                  Target Exposure Assessment
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${threatColor}`}
                >
                  Threat: {report.threatLevel || 'EVALUATED'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-text-secondary leading-relaxed">
                Calculated exposure risk based on correlated breaches, social footprint, and infrastructure endpoints.
              </p>
              <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-accent-cyan-dim/30 mt-2">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${report.opsecScore}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center">
              <RadialGauge
                value={report.opsecScore}
                size={100}
                threatLevel={report.threatLevel || 'MEDIUM'}
                label="OPSEC Exposure"
              />
            </div>
          </div>
        )}

        {/* Module Execution Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {report.toolResults.map((t) => (
            <div
              key={t.toolId}
              className="p-2 bg-bg-surface-raised border border-accent-cyan-dim/20 rounded text-[11px] font-mono flex items-center justify-between"
            >
              <div className="truncate pr-1">
                <span className="text-text-primary font-medium">{t.displayName}</span>
              </div>
              <div className="flex items-center gap-1">
                {t.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-status-error" />
                )}
                <span className="text-[10px] text-accent-cyan font-bold">{t.entitiesCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Correlated Entities Section */}
      <div className="border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-5 rounded space-y-4 shadow-cyan-glow">
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/20 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs uppercase tracking-wider font-mono text-accent-cyan font-semibold">
              Correlated Entity Nodes ({report.entities.length})
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">
            Click &apos;Search Entity&apos; to fan out deeper recon
          </span>
        </div>

        {report.entities.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-text-muted">
            No linked entities or footprints discovered across executed tools.
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.entities.map((entity, idx) => {
              const toolColor =
                TOOL_COLORS[entity.sourceTool] || {
                  badge: 'bg-accent-cyan/15 border-accent-cyan/60 text-accent-cyan',
                  border: 'border-accent-cyan-dim/40',
                  text: 'text-accent-cyan',
                };

              const isURL = entity.value.startsWith('http://') || entity.value.startsWith('https://');
              const isHighRisk =
                entity.sourceTool === 'h8mail' ||
                entity.sourceTool === 'shodan_api' ||
                entity.sourceTool === 'abuseipdb';

              return (
                <div
                  key={idx}
                  onClick={() => {
                    soundFx.playBlip();
                    setInspectedEntity(entity);
                  }}
                  className={`entity-card p-3.5 bg-bg-surface-raised/70 border ${toolColor.border} rounded flex flex-col justify-between space-y-2 relative group hover:border-accent-cyan cursor-pointer transition-all ${
                    isHighRisk ? 'ring-1 ring-status-error/40' : ''
                  }`}
                >
                  {/* High Risk Hazard Beacon */}
                  {isHighRisk && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-status-error animate-ping" />
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${toolColor.badge}`}
                        >
                          {entity.sourceTool}
                        </span>
                        {isHighRisk && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-status-error/15 border border-status-error/40 text-status-error uppercase font-bold">
                            ALERT
                          </span>
                        )}
                      </div>

                      {entity.confidence && (
                        <span className="text-[10px] font-mono text-text-muted">
                          {Math.round(entity.confidence * 100)}% match
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-text-primary font-mono break-all pt-1 flex items-center gap-1.5">
                      <span className="truncate">{entity.value}</span>
                      {isURL && (
                        <a
                          href={entity.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-text-muted hover:text-accent-cyan inline-flex shrink-0"
                          title="Open external link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 font-mono">
                      {entity.label}
                    </p>
                  </div>

                  {/* Fan-out / Secondary Search Button */}
                  <div className="pt-2 border-t border-accent-cyan-dim/15 flex items-center justify-between">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-base text-text-muted uppercase">
                      {entity.type}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFanOutSearch(
                          entity.value,
                          (entity.type as InputType) || 'username',
                        );
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-accent-cyan/15 border border-accent-cyan/50 hover:bg-accent-cyan hover:text-bg-base text-accent-cyan text-[10px] font-mono font-semibold rounded transition-all shadow-cyan-glow"
                    >
                      <span>Fan-Out</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entity Inspector Drawer */}
      <EntityInspectorDrawer
        entity={inspectedEntity}
        isOpen={!!inspectedEntity}
        onClose={() => setInspectedEntity(null)}
        onFanOutSearch={onFanOutSearch}
      />
    </div>
  );
}
