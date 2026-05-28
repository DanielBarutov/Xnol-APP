import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DevFrame } from './shared/components/DevFrame'
import { BottomNav } from './shared/components/BottomNav'
import { Toast } from './shared/components/Toast'
import { ModalRoot } from './shared/components/ModalRoot'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { useUIStore } from './store/ui'
import { useAuthStore } from './store/auth'
import { THEMES } from './shared/tokens'
import { authApi } from './api/endpoints/auth'
import { LoginScreen } from './features/auth/LoginScreen'
import { RegisterScreen } from './features/auth/RegisterScreen'
import { HomeScreen } from './features/home/HomeScreen'
import { AccountsScreen } from './features/accounts/AccountsScreen'
import { AnalyticsScreen } from './features/analytics/AnalyticsScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'
import type { ThemeName } from './shared/tokens'

function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<BottomNav /></>
}

export default function App() {
  const theme = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const { accessToken, setUser } = useAuthStore()

  useEffect(() => {
    const t = THEMES[theme]
    const r = document.documentElement
    r.style.setProperty('--accent', t.accent)
    r.style.setProperty('--accent-2', t.accent2)
    r.style.setProperty('--accent-3', t.accent3)
    r.style.setProperty('--accent-glow', t.glow)
    r.style.setProperty('--accent-shadow', t.shadow)
    r.style.setProperty('--accent-tint', t.accent + '22')
    const glowBase = t.bgGlowDark.slice(0, t.bgGlowDark.lastIndexOf(','))
    r.style.setProperty('--accent-bg-start', `${glowBase}, 0.70)`)
    r.style.setProperty('--accent-bg-end',   `${glowBase}, 0.25)`)
    const glowColor = themeMode === 'dark' ? t.bgGlowDark : t.bgGlowLight
    const bgBase = themeMode === 'dark' ? '#12151f' : '#f4f6fb'
    r.style.setProperty(
      '--bg-gradient',
      `radial-gradient(ellipse 90% 42% at 50% -2%, ${glowColor} 0%, transparent 62%), ${bgBase}`
    )
  }, [theme, themeMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    if (accessToken) {
      authApi.me().then(setUser).catch(() => {})
      authApi.getTheme().then(t => {
        setThemeMode(t.theme_mode as 'dark' | 'light')
        if (['violet', 'teal', 'amber', 'rose'].includes(t.theme_color)) {
          setTheme(t.theme_color as ThemeName)
        }
      }).catch(() => {})
    }
  }, [accessToken])

  return (
    <DevFrame>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-gradient)', color: 'var(--color-text-primary)', overflowY: 'auto', overflowX: 'hidden' }}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ScreenLayout><HomeScreen /></ScreenLayout>} />
            <Route path="/accounts" element={<ScreenLayout><AccountsScreen /></ScreenLayout>} />
            <Route path="/analytics" element={<ScreenLayout><AnalyticsScreen /></ScreenLayout>} />
            <Route path="/profile" element={<ScreenLayout><ProfileScreen /></ScreenLayout>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ModalRoot />
        <Toast />
      </div>
    </DevFrame>
  )
}
