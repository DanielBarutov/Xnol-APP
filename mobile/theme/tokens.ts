export type ThemeName = 'violet' | 'teal' | 'amber' | 'rose'
export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  accent: string
  accent2: string
  accent3: string
  accentTint: string
  accentShadow: string
  bg: string
  surface: string
  surface2: string
  border: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  income: string
  expense: string
}

const ACCENTS: Record<ThemeName, { accent: string; accent2: string; accent3: string; shadow: string }> = {
  violet: { accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7', shadow: 'rgba(99,102,241,0.45)' },
  teal:   { accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4', shadow: 'rgba(20,184,166,0.45)' },
  amber:  { accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24', shadow: 'rgba(245,158,11,0.45)' },
  rose:   { accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e', shadow: 'rgba(236,72,153,0.45)' },
}

const DARK_BASE: Omit<ThemeColors, 'accent' | 'accent2' | 'accent3' | 'accentTint' | 'accentShadow'> = {
  bg: '#12151f',
  surface: '#1a1e2e',
  surface2: '#222640',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.38)',
  income: '#34d399',
  expense: '#f87171',
}

const LIGHT_BASE: Omit<ThemeColors, 'accent' | 'accent2' | 'accent3' | 'accentTint' | 'accentShadow'> = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surface2: '#eef0f7',
  border: 'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(0,0,0,0.14)',
  textPrimary: '#0f1117',
  textSecondary: 'rgba(0,0,0,0.60)',
  textMuted: 'rgba(0,0,0,0.38)',
  income: '#059669',
  expense: '#dc2626',
}

export function buildTheme(name: ThemeName, mode: ThemeMode): ThemeColors {
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE
  const a = ACCENTS[name]
  return {
    ...base,
    accent: a.accent,
    accent2: a.accent2,
    accent3: a.accent3,
    accentTint: a.accent + '22',
    accentShadow: a.shadow,
  }
}
