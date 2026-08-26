export interface TacticalTheme {
  id: string;
  name: string;
  accent: string;
  accentGlow: string;
  bgBase: string;
  bgSurface: string;
  badge: string;
  description: string;
}

export const TACTICAL_THEMES: TacticalTheme[] = [
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan (Default HUD)',
    accent: '#22d3ee',
    accentGlow: 'rgba(34, 211, 238, 0.4)',
    bgBase: '#0a0e14',
    bgSurface: '#111826',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'High-contrast sci-fi command center HUD with luminous cyan vector beams.',
  },
  {
    id: 'matrix-amber',
    name: 'Stealth Matrix Amber',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    bgBase: '#090805',
    bgSurface: '#17140e',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Tactical night-vision amber HUD optimized for low-fatigue darkroom analysis.',
  },
  {
    id: 'midnight-cobalt',
    name: 'Midnight Cobalt (SOC)',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.4)',
    bgBase: '#060d19',
    bgSurface: '#0f1b2e',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Deep navy SOC monitoring center interface designed for continuous threat ops.',
  },
  {
    id: 'phosphor-emerald',
    name: 'Phosphor Emerald (Terminal)',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    bgBase: '#040d08',
    bgSurface: '#0c1a11',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Stark monochrome phosphor green CRT aesthetic with instant response.',
  },
];
