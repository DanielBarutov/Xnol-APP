// frontend/src/features/auth/LoginScreen.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/endpoints/auth'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../../shared/tokens'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const showToast = useUIStore((s) => s.showToast)

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      navigate('/', { replace: true })
    },
    onError: () => showToast('Неверный email или пароль', COLORS.expense),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary }}>Добро пожаловать</div>
        <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 6 }}>Войдите в свой аккаунт XNoll</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" required autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Пароль" required autoComplete="current-password"
          style={inputStyle}
        />
        <button type="submit" disabled={mutation.isPending} style={btnStyle(!mutation.isPending)}>
          {mutation.isPending ? 'Входим...' : 'Войти'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: COLORS.textSecondary }}>
        Нет аккаунта?{' '}
        <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 16, fontSize: 15,
  background: COLORS.surface2, border: `1.5px solid ${COLORS.border}`,
  color: COLORS.textPrimary, outline: 'none', width: '100%', boxSizing: 'border-box',
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: 15, borderRadius: 16, fontSize: 15, fontWeight: 700,
  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
  color: active ? '#fff' : COLORS.textSecondary,
  border: 0, cursor: active ? 'pointer' : 'default',
  boxShadow: active ? '0 10px 22px var(--accent-shadow)' : 'none',
})
