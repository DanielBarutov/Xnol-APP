import { NavLink } from 'react-router-dom'
import { Icons } from '../icons'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../tokens'

const TABS = [
  { to: '/',          label: 'Главная',   icon: Icons.home },
  { to: '/accounts',  label: 'Счета',     icon: Icons.bank },
  { to: '/analytics', label: 'Аналитика', icon: Icons.chart },
  { to: '/profile',   label: 'Профиль',   icon: Icons.user },
]

export function BottomNav() {
  const openModal  = useUIStore((s) => s.openModal)
  const themeMode  = useUIStore((s) => s.themeMode)
  const isLight = themeMode === 'light'

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 20px)', paddingTop: 10,
      background: isLight
        ? 'var(--color-surface)'
        : 'linear-gradient(to top, rgba(8,10,20,0.97) 60%, rgba(8,10,20,0))',
      backdropFilter: 'blur(20px)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
      borderTop: `1px solid ${COLORS.border}`,
      boxShadow: isLight ? '0 -4px 16px rgba(0,0,0,0.06)' : 'none',
      zIndex: 30,
    }}>
      {TABS.slice(0, 2).map(tab => <NavItem key={tab.to} {...tab} />)}
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <button
          onClick={() => openModal('add-tx')}
          style={{
            width: 50, height: 50, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 0, color: '#fff', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 10px 22px var(--accent-shadow)',
            transform: 'translateY(-6px)',
          }}
        >
          {Icons.plus(22)}
        </button>
      </div>
      {TABS.slice(2).map(tab => <NavItem key={tab.to} {...tab} />)}
    </div>
  )
}

function NavItem({ to, label, icon }: typeof TABS[0]) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      background: 'none', border: 0, cursor: 'pointer', textDecoration: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      color: isActive ? 'var(--accent)' : COLORS.textMuted, padding: 0,
    })}>
      {({ isActive }) => (
        <>
          <div style={{
            width: 38, height: 28, borderRadius: 9,
            background: isActive ? 'var(--accent-tint)' : 'transparent',
            display: 'grid', placeItems: 'center',
          }}>
            {icon(20)}
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
