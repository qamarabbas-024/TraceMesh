'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { TACTICAL_THEMES, type TacticalTheme } from '@/lib/themeConfig';
import { soundFx } from '@/lib/soundFx';

export function ThemeSwitcher() {
  const [activeThemeId, setActiveThemeId] = useState<string>('cyber-cyan');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tracemesh_tactical_theme');
      if (saved) {
        setActiveThemeId(saved);
        applyTheme(saved);
      }
    } catch {}
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = TACTICAL_THEMES.find((t) => t.id === themeId) || TACTICAL_THEMES[0];
    document.documentElement.style.setProperty('--accent-cyan', theme.accent);
    document.documentElement.style.setProperty('--bg-base', theme.bgBase);
    document.documentElement.style.setProperty('--bg-surface', theme.bgSurface);
  };

  const handleSelect = (themeId: string) => {
    soundFx.playBlip();
    setActiveThemeId(themeId);
    applyTheme(themeId);
    try {
      localStorage.setItem('tracemesh_tactical_theme', themeId);
    } catch {}
    setIsOpen(false);
  };

  const activeTheme = TACTICAL_THEMES.find((t) => t.id === activeThemeId) || TACTICAL_THEMES[0];

  return (
    <div className="relative font-mono">
      <button
        onClick={() => {
          soundFx.playBlip();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-2 py-1 text-xs border border-accent-cyan-dim/40 hover:border-accent-cyan bg-bg-surface-raised text-text-secondary hover:text-accent-cyan rounded transition-all"
        title="Switch Tactical HUD Theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: activeTheme.accent }}
        />
        <span className="hidden xl:inline text-[10px] uppercase">{activeTheme.name.split(' ')[0]}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-bg-surface border border-accent-cyan rounded-lg shadow-cyan-glow-heavy text-left space-y-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-2">
              <span className="text-[10px] uppercase font-bold text-accent-cyan">
                Tactical HUD Palettes
              </span>
              <Palette className="w-3.5 h-3.5 text-accent-cyan" />
            </div>

            <div className="space-y-1.5">
              {TACTICAL_THEMES.map((theme) => {
                const isSelected = theme.id === activeThemeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`w-full p-2 rounded border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-accent-cyan/15 border-accent-cyan text-text-primary shadow-sm'
                        : 'bg-bg-surface-raised border-accent-cyan-dim/20 text-text-secondary hover:border-accent-cyan-dim'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <div>
                        <div className="text-[11px] font-bold">{theme.name}</div>
                        <div className="text-[9px] text-text-muted">{theme.description.substring(0, 30)}...</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent-cyan shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
