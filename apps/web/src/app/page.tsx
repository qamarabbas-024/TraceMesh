'use client';

import { useState, useEffect } from 'react';
import { BackendStatus } from '@/components/BackendStatus';
import { ToolSelector } from '@/components/ToolSelector';
import { ExecutionResults } from '@/components/ExecutionResults';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { AuthModal } from '@/components/AuthModal';
import { EntityGlobe } from '@/components/EntityGlobe';
import { ImportModal } from '@/components/ImportModal';
import type { InputType, AggregatedReport } from '@tracemesh/shared';
import { History, User as UserIcon, LogOut, Shield, Zap, Sparkles, UploadCloud } from 'lucide-react';

export default function Home() {
  const [report, setReport] = useState<AggregatedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fanOutTarget, setFanOutTarget] = useState<{ value: string; type: InputType } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Auth & Modal states
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('tracemesh_token');
      const savedUser = localStorage.getItem('tracemesh_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {}
  }, []);

  const handleAuthSuccess = (authUser: { id: string; email: string; name?: string }, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    try {
      localStorage.setItem('tracemesh_token', authToken);
      localStorage.setItem('tracemesh_user', JSON.stringify(authUser));
    } catch {}
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('tracemesh_token');
      localStorage.removeItem('tracemesh_user');
    } catch {}
  };

  const handleRun = async (inputValue: string, inputType: InputType, toolIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      const res = await fetch(`${apiUrl}/runs/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputValue,
          inputType,
          toolIds,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to execute batch query`);
      }

      const data: AggregatedReport = await res.json();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFanOutSearch = (value: string, type: InputType) => {
    setFanOutTarget({ value, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Navbar */}
      <nav className="w-full flex items-center justify-between border-b border-accent-cyan-dim/20 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded border border-accent-cyan flex items-center justify-center bg-bg-surface-raised shadow-cyan-glow">
            <Shield className="w-4 h-4 text-accent-cyan" />
          </div>
          <span className="font-mono text-sm uppercase tracking-widest font-bold text-text-primary">
            Trace<span className="text-accent-cyan">Mesh</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Reduce motion toggle per DESIGN.md Section 5 */}
          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
              reduceMotion
                ? 'bg-accent-amber/15 border-accent-amber/50 text-accent-amber'
                : 'bg-bg-surface border-accent-cyan-dim/30 text-text-secondary hover:text-text-primary'
            }`}
            title="Toggle reduced motion mode"
          >
            {reduceMotion ? 'Motion: Reduced' : 'Motion: Smooth'}
          </button>

          {/* Import Chat / Text Button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-bg-surface border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
            title="Import intelligence notes or chat transcripts"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import Data</span>
          </button>

          {/* History Drawer Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-bg-surface border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Intel History</span>
          </button>

          {/* User / Auth State */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono bg-bg-surface-raised border border-accent-cyan-dim/40 text-accent-cyan rounded">
                {user.name || user.email.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-text-muted hover:text-status-error transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-accent-cyan/15 border border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg-base font-semibold rounded transition-all shadow-cyan-glow"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Operator Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* 3D Entity Graph Globe Visual Centerpiece (DESIGN.md Section 4) */}
      <section className="w-full">
        <EntityGlobe
          rootValue={report?.root.value}
          rootType={report?.root.type}
          entities={report?.entities || []}
          onNodeClick={handleFanOutSearch}
          reduceMotion={reduceMotion}
        />
      </section>

      {/* Main Command Header */}
      <header className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] uppercase tracking-widest font-mono text-accent-cyan bg-bg-surface border border-accent-cyan-dim/40 rounded shadow-cyan-glow">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          Autonomous Multi-Domain Aggregator
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
          Unified Multi-Domain Intel Aggregator
        </h1>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          One unified input for emails, usernames, phones, domains, IPs, and media. Parallel multi-source execution with automated entity correlation.
        </p>
      </header>

      {/* Main Tool Selector & Search Bar */}
      <ToolSelector
        key={fanOutTarget ? `${fanOutTarget.value}-${fanOutTarget.type}` : 'default'}
        onRun={handleRun}
      />

      {/* Error display */}
      {error && (
        <div className="w-full max-w-3xl p-4 rounded border border-status-error/40 bg-status-error/10 text-left font-mono text-xs text-status-error">
          Execution Error: {error}
        </div>
      )}

      {/* Aggregated Results & Entity Correlation Graph */}
      {(loading || report) && (
        <ExecutionResults
          report={report}
          loading={loading}
          onFanOutSearch={handleFanOutSearch}
        />
      )}

      {/* Telemetry & Subsystem Diagnostics */}
      <div className="w-full max-w-3xl pt-6">
        <BackendStatus />
      </div>

      {/* Modals & Drawers */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRun={(pastReport) => {
          setReport(pastReport);
          window.scrollTo({ top: 400, behavior: 'smooth' });
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSelectEntity={handleFanOutSearch}
      />
    </main>
  );
}
