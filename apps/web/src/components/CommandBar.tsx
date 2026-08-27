'use client';

import { useState, useEffect, useRef } from 'react';
import type { InputType } from '@tracemesh/shared';
import {
  Crosshair,
  Search,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  Network,
} from 'lucide-react';
import { soundFx } from '@/lib/soundFx';

interface CommandBarProps {
  onRun: (inputValue: string, inputType: InputType, deepRecon?: boolean, maxHops?: number) => void;
  loading: boolean;
  selectedToolCount: number;
}

export function CommandBar({ onRun, loading, selectedToolCount }: CommandBarProps) {
  const [inputVal, setInputVal] = useState('');
  const [detectedType, setDetectedType] = useState<InputType>('username');
  const [isFocused, setIsFocused] = useState(false);
  const [deepRecon, setDeepRecon] = useState(false);
  const [maxHops, setMaxHops] = useState(2);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect input type as user types
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setDetectedType('username');
      return;
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setDetectedType('email');
    } else if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(trimmed)) {
      setDetectedType('ip');
    } else if (/^\+?[0-9\s\-()]{7,20}$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 7) {
      setDetectedType('phone');
    } else if (
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
        trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      )
    ) {
      setDetectedType('domain');
    } else {
      setDetectedType('username');
    }
  }, [inputVal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;
    soundFx.playLockOn();
    onRun(inputVal.trim(), detectedType, deepRecon, maxHops);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none">
      <form
        onSubmit={handleSubmit}
        className={`pointer-events-auto w-full p-2 bg-bg-surface/90 backdrop-blur-xl border rounded-lg transition-all shadow-2xl flex items-center justify-between gap-2.5 font-mono ${
          isFocused
            ? 'border-accent-cyan shadow-cyan-glow-heavy'
            : 'border-accent-cyan-dim/40 hover:border-accent-cyan/60'
        }`}
      >
        {/* Left: Animated Lock-On Crosshair & Detected Tag */}
        <div className="flex items-center gap-2 pl-2">
          <div className="relative flex items-center justify-center w-6 h-6">
            <Crosshair
              className={`w-4 h-4 text-accent-cyan transition-transform duration-300 ${
                isFocused ? 'rotate-90 scale-110 animate-spin' : ''
              }`}
            />
          </div>

          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-accent-cyan/15 border border-accent-cyan/50 text-accent-cyan">
            {detectedType}
          </span>
        </div>

        {/* Input Target Box */}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`Enter ${detectedType} target identifier...`}
          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-text-primary placeholder:text-text-muted font-mono py-1"
        />

        {/* Deep Recon Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            soundFx.playBlip();
            setDeepRecon(!deepRecon);
          }}
          className={`hidden md:flex items-center gap-1 px-2 py-1 text-[10px] uppercase border rounded transition-all shrink-0 ${
            deepRecon
              ? 'border-accent-cyan bg-accent-cyan/20 text-accent-cyan shadow-cyan-glow'
              : 'border-accent-cyan-dim/30 text-text-muted hover:text-text-secondary'
          }`}
          title="Toggle Autonomous Multi-Hop Recursive Reconnaissance"
        >
          <Network className="w-3 h-3" />
          <span>{deepRecon ? `Deep (${maxHops} Hops)` : 'Deep: Off'}</span>
        </button>

        {/* Right: Submit Button */}
        <button
          type="submit"
          disabled={!inputVal.trim() || loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-cyan text-bg-base font-bold text-xs uppercase tracking-wider font-mono rounded hover:bg-cyan-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-cyan-glow shrink-0"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
