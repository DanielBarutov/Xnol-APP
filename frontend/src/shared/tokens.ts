export type ThemeName = 'violet' | 'teal' | 'amber' | 'rose'

export interface Theme {
  name: string
  accent: string
  accent2: string
  accent3: string
  glow: string
  shadow: string
  swatches: [string, string, string]
  bgGlowDark: string   // rgba at 0% stop of bg radial gradient (dark mode)
  bgGlowLight: string  // rgba at 0% stop of bg radial gradient (light mode)
}

export const THEMES: Record<ThemeName, Theme> = {
  violet: {
    name: 'Violet',
    swatches: ['#6366f1', '#8b5cf6', '#a855f7'],
    accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7',
    glow: 'rgba(99,102,241,0.20)', shadow: 'rgba(99,102,241,0.45)',
    bgGlowDark: 'rgba(99,102,241,0.30)',
    bgGlowLight: 'rgba(99,102,241,0.06)',
  },
  teal: {
    name: 'Teal',
    swatches: ['#0f766e', '#14b8a6', '#06b6d4'],
    accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4',
    glow: 'rgba(20,184,166,0.18)', shadow: 'rgba(20,184,166,0.45)',
    bgGlowDark: 'rgba(20,184,166,0.26)',
    bgGlowLight: 'rgba(20,184,166,0.05)',
  },
  amber: {
    name: 'Amber',
    swatches: ['#f59e0b', '#f97316', '#fbbf24'],
    accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24',
    glow: 'rgba(245,158,11,0.18)', shadow: 'rgba(245,158,11,0.45)',
    bgGlowDark: 'rgba(245,158,11,0.22)',
    bgGlowLight: 'rgba(245,158,11,0.04)',
  },
  rose: {
    name: 'Rose',
    swatches: ['#e11d48', '#ec4899', '#f43f5e'],
    accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e',
    glow: 'rgba(236,72,153,0.18)', shadow: 'rgba(236,72,153,0.45)',
    bgGlowDark: 'rgba(236,72,153,0.28)',
    bgGlowLight: 'rgba(236,72,153,0.05)',
  },
}

export const COLORS = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface2)',
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-strong)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  income: '#34d399',
  expense: '#f87171',
}
