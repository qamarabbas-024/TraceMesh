import { BackendStatus } from '@/components/BackendStatus';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-xl mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 text-[11px] uppercase tracking-widest font-mono text-accent-cyan bg-bg-surface border border-accent-cyan-dim/40 rounded mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          TraceMesh OSINT Framework v1.4
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight mb-2">
          Intelligence Correlation HUD
        </h1>
        <p className="text-sm text-text-secondary">
          Decentralized OSINT multi-tool aggregation engine and entity graph visualizer.
        </p>
      </div>

      <BackendStatus />
    </main>
  );
}
