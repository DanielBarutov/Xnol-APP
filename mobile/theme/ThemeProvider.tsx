import React, { createContext, useContext } from 'react'
import { useUIStore } from '../store/ui'
import { buildTheme, ThemeColors } from './tokens'

const ThemeContext = createContext<ThemeColors | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeName = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const colors = buildTheme(themeName, themeMode)
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeColors {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
