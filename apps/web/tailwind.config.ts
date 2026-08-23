import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0a0e14',
        'bg-surface': '#111826',
        'bg-surface-raised': '#161f30',
        'text-primary': '#e8edf4',
        'text-secondary': '#9aa7bd',
        'text-muted': '#5e6b82',
        'accent-cyan': '#22d3ee',
        'accent-cyan-dim': '#0e7490',
        'accent-amber': '#f59e0b',
        'accent-amber-dim': '#92400e',
        'status-success': '#34d399',
        'status-error': '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
