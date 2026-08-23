'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from '@tracemesh/shared';
import { Activity, Database, Server, RefreshCw, AlertTriangle } from 'lucide-react';

export function BackendStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/health`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data: HealthStatus = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xl border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-6 rounded relative overflow-hidden shadow-[0_0_24px_rgba(34,211,238,0.12)]">
      {/* Top HUD decoration bar */}
      <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan animate-ping" />
          <span className="text-xs uppercase tracking-widest text-accent-cyan font-mono font-medium">
            Core Node Status // Telemetry
          </span>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] font-mono text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50"
          title="Refresh Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Main Connection Status Card */}
      {loading && !health && !error && (
        <div className="py-8 text-center">
          <div className="inline-block w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
            Connecting to TraceMesh Backend Subsystems...
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded border border-status-error/40 bg-status-error/10 text-left mb-4">
          <div className="flex items-center gap-2 text-status-error text-xs font-mono font-semibold uppercase mb-1">
            <AlertTriangle className="w-4 h-4" />
            Backend Link Disconnected
          </div>
          <p className="text-xs text-text-secondary font-mono">
            {error} (Ensure NestJS API is running on :3001)
          </p>
        </div>
      )}

      {health && (
        <div className="space-y-4 text-left">
          {/* Status Badge & Service */}
          <div className="flex items-center justify-between bg-bg-surface-raised/80 p-3 border border-accent-cyan-dim/20 rounded">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-accent-cyan" />
              <div>
                <div className="text-xs font-mono text-text-primary font-medium">
                  {health.service}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  v{health.version} • Uptime: {health.uptime}s
                </div>
              </div>
            </div>

            <div
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border ${
                health.status === 'ok'
                  ? 'bg-status-success/15 border-status-success/60 text-status-success'
                  : 'bg-accent-amber/15 border-accent-amber/60 text-accent-amber'
              }`}
            >
              {health.status === 'ok' ? 'Online' : health.status}
            </div>
          </div>

          {/* Database & Subsystems Details */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-bg-surface-raised/50 border border-accent-cyan-dim/20 rounded">
              <div className="flex items-center gap-1.5 text-text-secondary text-[10px] uppercase tracking-wider mb-1">
                <Database className="w-3.5 h-3.5 text-accent-cyan" />
                PostgreSQL Data Layer
              </div>
              <div className="flex items-center justify-between mt-1">
                <span
                  className={
                    health.database.status === 'connected'
                      ? 'text-status-success font-medium'
                      : 'text-text-muted'
                  }
                >
                  {health.database.status}
                </span>
                {health.database.latencyMs !== undefined && (
                  <span className="text-[10px] text-text-secondary">
                    {health.database.latencyMs}ms
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-bg-surface-raised/50 border border-accent-cyan-dim/20 rounded">
              <div className="flex items-center gap-1.5 text-text-secondary text-[10px] uppercase tracking-wider mb-1">
                <Activity className="w-3.5 h-3.5 text-accent-cyan" />
                Telemetry Timestamp
              </div>
              <div className="text-[11px] text-text-primary mt-1 truncate" title={health.timestamp}>
                {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-accent-cyan-dim/20 flex justify-between items-center text-[10px] font-mono text-text-muted">
        <span>Protocol: HTTP/REST</span>
        {lastChecked && <span>Last sync: {lastChecked.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
