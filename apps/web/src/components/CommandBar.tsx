'use client';

import { useState, useEffect, useRef } from 'react';
import type { InputType } from '@tracemesh/shared';
import {
  Crosshair,
  Search,
  Zap,
  CheckCircle,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Command,
} from 'lucide-react';

interface CommandBarProps {
  onRun: (inputValue: string, inputType: InputType) => void;
  loading: boolean;
  selectedToolCount: number;
}

export function CommandBar({ onRun, loading, selectedToolCount }: CommandBarProps) {
  const [inputVal, setInputVal] = useState('');
  const [detectedType, setDetectedType] = useState<InputType>('username');
  const [isFocused, setIsFocused] = useState(false);
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
    onRun(inputVal.trim(), detectedType);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none">
      <form
        onSubmit={handleSubmit}
        className={`pointer-events-auto w-full p-2 bg-bg-surface/90 backdrop-blur-xl border rounded-lg transition-all shadow-2xl flex items-center justify-between gap-3 font-mono ${
          isFocused
            ? 'border-accent-cyan shadow-cyan-glow-heavy'
            : 'border-accent-cyan-dim/40 hover:border-accent-cyan/60'
        }`}
      >
        {/* Left: Animated Lock-On Crosshair & Detected Tag */}
        <div className="flex items-center gap-2.5 pl-2">
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

        {/* Center: Command Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter email, username, phone, IP, or domain to dispatch intel..."
          className="flex-1 bg-transparent text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none font-mono"
        />

        {/* Right: Quick Run Action Button */}
        <button
          type="submit"
          disabled={!inputVal.trim() || loading}
          className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold rounded transition-all shadow-cyan-glow ${
            !inputVal.trim() || loading
              ? 'bg-bg-surface-raised border border-accent-cyan-dim/20 text-text-muted cursor-not-allowed'
              : 'bg-accent-cyan text-bg-base hover:bg-accent-cyan/90 border border-accent-cyan'
          }`}
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{loading ? 'Scanning' : 'Dispatch'}</span>
        </button>
      </form>
    </div>
  );
}
