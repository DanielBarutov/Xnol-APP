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

function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<BottomNav /></>
}

export default function App() {
  const theme = useUIStore((s) => s.theme)
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
  }, [theme])

  useEffect(() => {
    if (accessToken) {
      authApi.me().then(setUser).catch(() => {})
    }
  }, [accessToken])

  return (
    <DevFrame>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(ellipse at top, #11162a 0%, #060914 50%, #04060d 100%)', color: '#e6e9f2', overflowY: 'auto' }}>
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
