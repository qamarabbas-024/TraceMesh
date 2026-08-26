'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Radio,
  Clock,
  History,
  FileText,
  User,
  Zap,
  Briefcase,
} from 'lucide-react';

interface HudHeaderProps {
  onOpenHistory: () => void;
  onOpenImport: () => void;
  onOpenCases: () => void;
  onOpenAuth: () => void;
  user: any | null;
  reduceMotion: boolean;
  onToggleMotion: () => void;
  activeWorkerCount?: number;
}

export function HudHeader({
  onOpenHistory,
  onOpenImport,
  onOpenCases,
  onOpenAuth,
  user,
  reduceMotion,
  onToggleMotion,
  activeWorkerCount = 18,
}: HudHeaderProps) {
  const [utcTime, setUtcTime] = useState<string>('');
  const [latency, setLatency] = useState<number>(14);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      setLatency(Math.floor(10 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(pingInterval);
  }, []);

  return (
    <header className="relative w-full z-20 border-b border-accent-cyan-dim/40 bg-bg-surface/90 backdrop-blur-md px-4 py-2.5 shadow-cyan-glow">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
        {/* Left: Brand / Classification */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded border border-accent-cyan bg-bg-surface-raised shadow-cyan-glow">
            <Shield className="w-4 h-4 text-accent-cyan" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-status-success animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-widest text-text-primary uppercase">
                TraceMesh
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan font-semibold">
                HUD v6.2
              </span>
            </div>
            <div className="text-[10px] text-text-secondary tracking-wider uppercase">
              Autonomous OSINT Aggregation Engine
            </div>
          </div>
        </div>

        {/* Center: Live Mission Telemetry & Clock */}
        <div className="hidden md:flex items-center gap-5 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-text-primary">{utcTime || 'SYNCHRONIZING UTC...'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-status-success animate-pulse" />
            <span>
              PING: <strong className="text-text-primary">{latency}ms</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-accent-amber" />
            <span>
              WORKERS: <strong className="text-accent-cyan">{activeWorkerCount} ACTIVE</strong>
            </span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCases}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-accent-cyan-dim/40 hover:border-accent-cyan bg-bg-surface-raised text-text-secondary hover:text-accent-cyan rounded transition-all"
            title="Open Tactical Case Dossiers"
          >
            <Briefcase className="w-3.5 h-3.5 text-accent-amber" />
            <span className="hidden sm:inline">Cases</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-accent-cyan-dim/40 hover:border-accent-cyan bg-bg-surface-raised text-text-secondary hover:text-accent-cyan rounded transition-all"
            title="Import intelligence case transcripts or text"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import Intel</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-accent-cyan-dim/40 hover:border-accent-cyan bg-bg-surface-raised text-text-secondary hover:text-accent-cyan rounded transition-all"
            title="Open past investigation runs"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={onToggleMotion}
            className={`px-2 py-1 text-[10px] uppercase border rounded transition-all ${
              reduceMotion
                ? 'border-accent-amber text-accent-amber bg-accent-amber/10'
                : 'border-accent-cyan-dim/40 text-text-secondary hover:border-accent-cyan'
            }`}
            title="Toggle reduced motion"
          >
            {reduceMotion ? 'Motion: Off' : 'Motion: On'}
          </button>

          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-accent-cyan bg-accent-cyan/15 hover:bg-accent-cyan hover:text-bg-base text-accent-cyan font-bold rounded transition-all shadow-cyan-glow"
          >
            <User className="w-3.5 h-3.5" />
            <span>{user ? user.email.split('@')[0] : 'Operator'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
