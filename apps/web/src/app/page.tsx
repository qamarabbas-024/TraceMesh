'use client';

import { useState, useEffect } from 'react';
import { BackendStatus } from '@/components/BackendStatus';
import { ToolSelector } from '@/components/ToolSelector';
import { ExecutionResults } from '@/components/ExecutionResults';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { AuthModal } from '@/components/AuthModal';
import { EntityGlobe } from '@/components/EntityGlobe';
import { ImportModal } from '@/components/ImportModal';
import { ScanlineOverlay } from '@/components/ScanlineOverlay';
import { HudHeader } from '@/components/HudHeader';
import { CommandBar } from '@/components/CommandBar';
import { ActivityTicker } from '@/components/ActivityTicker';
import { CaseManagerDrawer } from '@/components/CaseManagerDrawer';
import type { InputType, AggregatedReport } from '@tracemesh/shared';
import { Shield, Zap, Sparkles, Terminal } from 'lucide-react';

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
  const [isCasesOpen, setIsCasesOpen] = useState(false);

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
    <div className="relative min-h-screen bg-bg-base text-text-primary flex flex-col items-center selection:bg-accent-cyan selection:text-bg-base">
      {/* Procedural Ambient Scanline & Cyber Grid */}
      <ScanlineOverlay opacity={0.04} />

      {/* Top HUD Mission Telemetry Bar */}
      <HudHeader
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenCases={() => setIsCasesOpen(true)}
        onOpenAuth={() => (user ? handleLogout() : setIsAuthOpen(true))}
        user={user}
        reduceMotion={reduceMotion}
        onToggleMotion={() => setReduceMotion(!reduceMotion)}
        activeWorkerCount={18}
      />

      {/* Main Viewport Container */}
      <main className="relative z-10 w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6 flex flex-col items-center">
        {/* Holographic 3D / 2D Graph Visualizer Viewport */}
        <section className="w-full">
          <EntityGlobe
            rootValue={report?.root.value}
            rootType={report?.root.type}
            entities={report?.entities || []}
            onNodeClick={handleFanOutSearch}
            reduceMotion={reduceMotion}
          />
        </section>

        {/* HUD Mission Classifier Banner */}
        <div className="text-center space-y-2 pt-1 font-mono">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-widest text-accent-cyan bg-bg-surface border border-accent-cyan-dim/40 rounded shadow-cyan-glow">
            <Terminal className="w-3 h-3 text-status-success animate-pulse" />
            <span>Autonomous Multi-Domain Cyber Reconnaissance Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary uppercase">
            Unified Intel <span className="text-accent-cyan">Command Center</span>
          </h1>
          <p className="text-xs text-text-secondary max-w-xl mx-auto font-sans leading-relaxed">
            Multi-source OSINT intelligence: emails, usernames, telephone routing, TLS infrastructure, and darknet graph correlation.
          </p>
        </div>

        {/* Main Tool Selector & Search Bar */}
        <ToolSelector
          key={fanOutTarget ? `${fanOutTarget.value}-${fanOutTarget.type}` : 'default'}
          onRun={handleRun}
        />

        {/* Error display */}
        {error && (
          <div className="w-full max-w-3xl p-4 rounded border border-status-error/50 bg-status-error/15 text-left font-mono text-xs text-status-error shadow-lg">
            <strong>EXECUTION FAULT // </strong> {error}
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
        <div className="w-full max-w-3xl pt-4">
          <BackendStatus />
        </div>
      </main>

      {/* Real-Time OSINT Threat Activity Stream Ticker */}
      <div className="w-full fixed bottom-0 left-0 right-0 z-20">
        <ActivityTicker />
      </div>

      {/* Floating Holographic Command Bar */}
      <div className="mb-8">
        <CommandBar
          onRun={(val, type) => handleRun(val, type, [])}
          loading={loading}
          selectedToolCount={18}
        />
      </div>

      {/* Modals & Drawers */}
      <CaseManagerDrawer
        isOpen={isCasesOpen}
        onClose={() => setIsCasesOpen(false)}
        onSelectEntity={handleFanOutSearch}
      />

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
    </div>
  );
}
