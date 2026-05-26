// frontend/src/features/auth/RegisterScreen.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/endpoints/auth'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../../shared/tokens'
import type { Currency } from '../../api/types'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']

export function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const showToast = useUIStore((s) => s.showToast)

  const mutation = useMutation({
    mutationFn: async (data: Parameters<typeof authApi.register>[0]) => {
      await authApi.register(data)
      return authApi.login({ email: data.email, password: data.password })
    },
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token)
      navigate('/', { replace: true })
    },
    onError: () => showToast('Ошибка регистрации. Попробуйте другой email.', COLORS.expense),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password, full_name: fullName, primary_currency: currency })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary }}>Создать аккаунт</div>
        <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 6 }}>Начните управлять финансами</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя" required style={inputStyle} />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="email" style={inputStyle} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required autoComplete="new-password" minLength={8} style={inputStyle} />

        <div style={{ display: 'flex', gap: 8 }}>
          {CURRENCIES.map(c => (
            <button key={c} type="button" onClick={() => setCurrency(c)} style={{
              flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 14, fontWeight: 600,
              background: currency === c ? 'var(--accent-tint)' : COLORS.surface2,
              border: `1.5px solid ${currency === c ? 'var(--accent)' : COLORS.border}`,
              color: currency === c ? 'var(--accent)' : COLORS.textSecondary,
              cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <button type="submit" disabled={mutation.isPending} style={btnStyle(!mutation.isPending)}>
          {mutation.isPending ? 'Создаём...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: COLORS.textSecondary }}>
        Уже есть аккаунт?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Войти</Link>
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
