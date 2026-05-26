import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DevFrame } from './shared/components/DevFrame'
import { BottomNav } from './shared/components/BottomNav'
import { Toast } from './shared/components/Toast'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { useUIStore } from './store/ui'
import { THEMES } from './shared/tokens'
import { LoginScreen } from './features/auth/LoginScreen'
import { RegisterScreen } from './features/auth/RegisterScreen'

// Lazy placeholders — replaced in plan 06b
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 32, color: '#6c7488', paddingBottom: 120 }}>{name} screen</div>
)

export default function App() {
  const theme = useUIStore((s) => s.theme)

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

  return (
    <DevFrame>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(ellipse at top, #11162a 0%, #060914 50%, #04060d 100%)', color: '#e6e9f2', overflowY: 'auto' }}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<><Placeholder name="Home" /><BottomNav /></>} />
            <Route path="/accounts" element={<><Placeholder name="Accounts" /><BottomNav /></>} />
            <Route path="/analytics" element={<><Placeholder name="Analytics" /><BottomNav /></>} />
            <Route path="/profile" element={<><Placeholder name="Profile" /><BottomNav /></>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </div>
    </DevFrame>
  )
}
