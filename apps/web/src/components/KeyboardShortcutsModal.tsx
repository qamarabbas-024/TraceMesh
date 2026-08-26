'use client';

import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '/', desc: 'Focus Command Bar search input' },
  { key: '1', desc: 'Switch visualizer to 3D Holographic Globe' },
  { key: '2', desc: 'Switch visualizer to 2D Tactical Force Graph' },
  { key: 'C', desc: 'Open Tactical Case Dossiers' },
  { key: 'H', desc: 'Open Intelligence Run History' },
  { key: 'M', desc: 'Toggle Reduced Motion Mode' },
  { key: 'S', desc: 'Toggle Procedural Audio Sound FX' },
  { key: 'Esc', desc: 'Close all active modals and drawers' },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/70 backdrop-blur-sm animate-fade-in font-mono p-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md bg-bg-surface border border-accent-cyan p-6 rounded-lg shadow-cyan-glow-heavy z-10 space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Command-Center Hotkeys
            </span>
          </div>

          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-bg-surface-raised border border-accent-cyan-dim/20 text-xs"
            >
              <span className="text-text-secondary">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/40 text-accent-cyan font-bold text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[10px] text-text-muted">
          Press <kbd className="text-accent-cyan font-bold">Esc</kbd> or click outside to dismiss.
        </div>
      </div>
    </div>
  );
}
