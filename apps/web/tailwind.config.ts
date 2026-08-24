import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background tokens per DESIGN.md
        'bg-base': '#0a0e14',
        'bg-surface': '#111826',
        'bg-surface-raised': '#161f30',
        'bg-overlay': 'rgba(10, 14, 20, 0.7)',

        // Text tokens
        'text-primary': '#e8edf4',
        'text-secondary': '#9aa7bd',
        'text-muted': '#5e6b82',

        // Primary Accent — Cyan ("live / active")
        'accent-cyan': '#22d3ee',
        'accent-cyan-dim': '#0e7490',
        'accent-cyan-glow': 'rgba(34, 211, 238, 0.4)',

        // Secondary Accent — Amber ("warnings / updates only")
        'accent-amber': '#f59e0b',
        'accent-amber-dim': '#92400e',

        // Status tokens
        'status-success': '#34d399',
        'status-error': '#f87171',
        'status-running': '#22d3ee',

        // Source-tool entity accents
        'tool-sherlock': '#818cf8',
        'tool-holehe': '#34d399',
        'tool-exiftool': '#fb923c',
        'tool-maigret': '#a78bfa',
        'tool-phoneinfoga': '#38bdf8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        heading: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '500' }],
        data: ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        'data-large': ['1.25rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      boxShadow: {
        'cyan-glow': '0 0 12px rgba(34, 211, 238, 0.4)',
        'cyan-glow-heavy': '0 0 24px rgba(34, 211, 238, 0.5)',
        'amber-glow': '0 0 12px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
