export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl border border-accent-cyan-dim/40 bg-bg-surface/80 backdrop-blur-md p-8 rounded shadow-[0_0_20px_rgba(34,211,238,0.15)]">
        <div className="text-xs uppercase tracking-widest text-accent-cyan mb-2 font-mono">
          System Initialized
        </div>
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-4">
          TraceMesh OSINT Platform
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Multi-domain OSINT aggregation engine and entity graph visualizer.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono bg-bg-surface-raised border border-accent-cyan-dim/30 text-accent-cyan">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          Core Monorepo v1.0 Ready
        </div>
      </div>
    </main>
  );
}
