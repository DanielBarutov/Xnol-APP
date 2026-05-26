import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { THEMES, COLORS } from '../../shared/tokens'
import { Icons } from '../../shared/icons'

export function ProfileScreen() {
  const { theme, setTheme, balanceVisible, toggleBalance } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 20, background: 'var(--accent-tint)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
          {user?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>{user?.full_name ?? '—'}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      {/* Theme picker */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Тема</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {(Object.entries(THEMES) as [keyof typeof THEMES, typeof THEMES[keyof typeof THEMES]][]).map(([k, v]) => (
            <button key={k} onClick={() => setTheme(k)} style={{
              padding: 12, borderRadius: 16, textAlign: 'left',
              background: theme === k ? COLORS.surface2 : `${COLORS.surface}88`,
              border: `1.5px solid ${theme === k ? v.accent : COLORS.border}`,
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {v.swatches.map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 6, background: c, display: 'inline-block' }} />)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{v.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings rows */}
      <div style={{ background: COLORS.surface2, borderRadius: 18, overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <button onClick={toggleBalance} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', background: 'none', border: 0, borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.textPrimary }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Скрыть баланс</span>
          <div style={{ width: 44, height: 26, borderRadius: 99, background: balanceVisible ? COLORS.border : 'var(--accent)', transition: 'background 0.2s', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 3, left: balanceVisible ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 0, borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.textSecondary }}>
          {Icons.gear(16)}<span style={{ fontSize: 14 }}>Настройки</span>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 0, cursor: 'pointer', color: COLORS.textSecondary }}>
          {Icons.bell(16)}<span style={{ fontSize: 14 }}>Помощь</span>
        </button>
      </div>

      <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: `${COLORS.expense}12`, border: `1px solid ${COLORS.expense}33`, borderRadius: 16, cursor: 'pointer', color: COLORS.expense }}>
        {Icons.logout(16)}<span style={{ fontSize: 14, fontWeight: 600 }}>Выйти</span>
      </button>
    </div>
  )
}
