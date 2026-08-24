'use client';

import { useState, useEffect } from 'react';
import type { AggregatedReport } from '@tracemesh/shared';
import { History, X, Clock, ArrowRight, Database, RefreshCw } from 'lucide-react';

interface HistoryItem {
  id: string;
  inputValue: string;
  inputType: string;
  status: string;
  createdAt: string;
  toolsCount: number;
  entitiesCount: number;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (report: AggregatedReport) => void;
}

export function HistoryDrawer({ isOpen, onClose, onSelectRun }: HistoryDrawerProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/runs/history`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch run history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const loadPastRun = async (runId: string) => {
    setLoadingRunId(runId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/runs/${runId}`);
      if (res.ok) {
        const report: AggregatedReport = await res.json();
        onSelectRun(report);
        onClose();
      }
    } catch (err) {
      console.error('Failed to load past run:', err);
    } finally {
      setLoadingRunId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-overlay backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-bg-surface border-l border-accent-cyan-dim/40 h-full p-6 flex flex-col justify-between shadow-cyan-glow overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/25 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent-cyan" />
              <span className="text-xs uppercase tracking-widest font-mono font-semibold text-accent-cyan">
                Intelligence Run History
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="text-text-secondary hover:text-accent-cyan p-1"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of past runs */}
          {loading && history.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-text-secondary">
              <div className="inline-block w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-2" />
              <p>Fetching historical telemetry...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-text-muted">
              No historical runs recorded in this session yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded bg-bg-surface-raised/70 border border-accent-cyan-dim/20 hover:border-accent-cyan-dim transition-all text-left space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-accent-cyan uppercase">
                      {item.inputType}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-text-primary font-bold truncate">
                    {item.inputValue}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-accent-cyan-dim/10 text-[11px] font-mono">
                    <span className="text-text-secondary">
                      {item.entitiesCount} Entities • {item.toolsCount} Tools
                    </span>

                    <button
                      onClick={() => loadPastRun(item.id)}
                      disabled={loadingRunId === item.id}
                      className="flex items-center gap-1 text-accent-cyan hover:text-cyan-300 font-semibold transition-colors disabled:opacity-50"
                    >
                      <span>{loadingRunId === item.id ? 'Loading...' : 'Load'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-accent-cyan-dim/20 text-center text-[10px] font-mono text-text-muted">
          Re-open past aggregated results with zero re-execution latency.
        </div>
      </div>
    </div>
  );
}
