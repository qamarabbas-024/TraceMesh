'use client';

import { useState } from 'react';
import type { DiscoveredEntity, InputType } from '@tracemesh/shared';
import {
  X,
  Search,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Layers,
  Code,
  Info,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface EntityInspectorDrawerProps {
  entity: DiscoveredEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onFanOutSearch: (value: string, type: InputType) => void;
}

export function EntityInspectorDrawer({
  entity,
  isOpen,
  onClose,
  onFanOutSearch,
}: EntityInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !entity) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(entity, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = entity.value.startsWith('http://') || entity.value.startsWith('https://');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-base/70 backdrop-blur-sm animate-fade-in font-mono">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md h-full bg-bg-surface/95 border-l border-accent-cyan/60 p-6 flex flex-col justify-between shadow-cyan-glow-heavy z-10 overflow-y-auto">
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-cyan" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Entity Deep Inspector
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1 text-center rounded transition-all uppercase text-[10px] font-bold ${
                activeTab === 'overview'
                  ? 'bg-accent-cyan text-bg-base shadow-cyan-glow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 py-1 text-center rounded transition-all uppercase text-[10px] font-bold flex items-center justify-center gap-1 ${
                activeTab === 'json'
                  ? 'bg-accent-cyan text-bg-base shadow-cyan-glow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Raw JSON</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' ? (
            <div className="space-y-4 pt-2">
              {/* Primary Value Block */}
              <div className="p-3.5 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/50 text-accent-cyan font-bold">
                    {entity.type}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Source: <strong className="text-text-primary">{entity.sourceTool}</strong>
                  </span>
                </div>

                <div className="text-sm font-bold text-text-primary break-all pt-1">
                  {entity.value}
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {entity.label}
                </p>
              </div>

              {/* Telemetry Confidence & Metrics */}
              <div className="p-3 bg-bg-surface-raised border border-accent-cyan-dim/25 rounded space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">
                  Confidence Rating & Attribution
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>Statistical Confidence:</span>
                  <span className="text-accent-cyan font-bold">
                    {Math.round((entity.confidence || 0.9) * 100)}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden border border-accent-cyan-dim/30">
                  <div
                    className="h-full bg-accent-cyan"
                    style={{ width: `${Math.round((entity.confidence || 0.9) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Extended Metadata Table */}
              {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                <div className="p-3 bg-bg-surface-raised border border-accent-cyan-dim/25 rounded space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">
                    Metadata Attributes
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary">
                    {Object.entries(entity.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-2 border-b border-accent-cyan-dim/15 pb-1">
                        <span className="text-[10px] uppercase text-text-muted">{k}:</span>
                        <span className="text-text-primary font-mono text-right truncate max-w-[200px]">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Syntax Highlighted Raw JSON */
            <div className="relative pt-2">
              <button
                onClick={handleCopy}
                className="absolute top-4 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-bg-base/80 border border-accent-cyan-dim/40 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded text-[10px] transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <pre className="p-3 bg-bg-base border border-accent-cyan-dim/30 rounded text-[11px] text-accent-cyan font-mono overflow-x-auto max-h-[360px] leading-relaxed select-all">
                {JSON.stringify(entity, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-accent-cyan-dim/30 space-y-2">
          {isUrl && (
            <a
              href={entity.value}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-bg-surface-raised border border-accent-cyan-dim/40 hover:border-accent-cyan text-text-primary text-xs font-bold uppercase rounded flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Verify External Link</span>
            </a>
          )}

          <button
            onClick={() => {
              onFanOutSearch(entity.value, (entity.type as InputType) || 'username');
              onClose();
            }}
            className="w-full py-2.5 bg-accent-cyan text-bg-base font-bold text-xs uppercase tracking-wider rounded hover:bg-cyan-300 flex items-center justify-center gap-2 transition-all shadow-cyan-glow"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Fan-Out Search (Recursive Recon)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
