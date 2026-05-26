// frontend/src/features/transactions/AddTxModal.tsx
import { useState, useEffect } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { useCreateTransaction } from './hooks/useCreateTransaction'
import { categoryEmoji, formatAmount } from '../../shared/lib/format'
import { Icons } from '../../shared/icons'
import { COLORS } from '../../shared/tokens'

const KEYPAD = ['1','2','3','4','5','6','7','8','9','.','0','←']

export function AddTxModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'add-tx'
  const defaultKind = (modal.payload as { kind?: string })?.kind === 'income' ? 'income' : 'expense'

  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<'income' | 'expense'>(defaultKind)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')

  const { mutation, categories, accounts } = useCreateTransaction()

  useEffect(() => {
    if (open) {
      setStep(1); setAmount(''); setCategoryId(''); setKind(defaultKind)
      if (accounts.data?.[0]) setAccountId(accounts.data[0].id)
    }
  }, [open])

  useEffect(() => {
    if (accounts.data?.[0] && !accountId) setAccountId(accounts.data[0].id)
  }, [accounts.data])

  const accent = kind === 'income' ? COLORS.income : COLORS.expense
  const allCats = categories.data?.flatMap(c => [c, ...(c.children ?? [])]) ?? []
  const filteredCats = allCats.filter(c => c.type === kind)

  const onKey = (k: string) => {
    if (k === '←') return setAmount(a => a.slice(0, -1))
    if (k === '.' && amount.includes('.')) return
    if (amount.length >= 10) return
    setAmount(a => (a === '0' && k !== '.') ? k : a + k)
  }

  const submit = () => {
    if (!categoryId || !accountId || !parseFloat(amount)) return
    mutation.mutate({
      account_id: accountId,
      category_id: categoryId,
      type: kind,
      amount: parseFloat(amount).toFixed(2),
      date: new Date().toISOString().slice(0, 10),
    })
  }

  const selectedAccount = accounts.data?.find(a => a.id === accountId)
  const selectedCat = categories.data?.find(c => c.id === categoryId)

  return (
    <Modal open={open} onClose={closeModal}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px 14px' }}>
        {step > 1
          ? <button onClick={() => setStep(s => s - 1)} style={iconBtn}>{Icons.chev(16)}</button>
          : <div style={{ width: 38 }} />}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Шаг {step} из 3 · {kind === 'income' ? 'Доход' : 'Расход'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginTop: 2 }}>
            {step === 1 ? 'Сумма' : step === 2 ? 'Категория' : 'Подтвердите'}
          </div>
        </div>
        <button onClick={closeModal} style={iconBtn}>{Icons.close(22)}</button>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 18px' }}>
        {[1,2,3].map(n => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: n <= step ? accent : COLORS.border, transition: 'background 0.2s' }} />
        ))}
      </div>

      {/* Step 1: keypad */}
      {step === 1 && (
        <div>
          {/* Kind toggle */}
          <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
            {(['income', 'expense'] as const).map(k => (
              <button key={k} onClick={() => setKind(k)} style={{
                flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
                background: kind === k ? (k === 'income' ? `${COLORS.income}22` : `${COLORS.expense}22`) : COLORS.surface2,
                border: `1.5px solid ${kind === k ? (k === 'income' ? COLORS.income : COLORS.expense) : COLORS.border}`,
                color: kind === k ? (k === 'income' ? COLORS.income : COLORS.expense) : COLORS.textSecondary,
                cursor: 'pointer',
              }}>{k === 'income' ? '+ Доход' : '− Расход'}</button>
            ))}
          </div>
          <div style={{ padding: '0 20px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: amount ? accent : COLORS.textMuted }}>
              <span style={{ fontSize: 26, opacity: 0.7 }}>{kind === 'income' ? '+' : '−'}</span>
              {amount || '0'}
              <span style={{ fontSize: 24, opacity: 0.5, color: COLORS.textSecondary, marginLeft: 4 }}>₽</span>
            </div>
          </div>
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {KEYPAD.map(k => (
              <button key={k} onClick={() => onKey(k)} style={{
                padding: '14px 0', fontSize: 22, fontWeight: 600,
                background: COLORS.surface2, color: k === '←' ? COLORS.textSecondary : COLORS.textPrimary,
                border: `1px solid ${COLORS.border}`, borderRadius: 14, cursor: 'pointer',
              }}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: category + account */}
      {step === 2 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
            {kind === 'income' ? 'Источник' : 'Категория расхода'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {filteredCats.map(cat => {
              const sel = cat.id === categoryId
              return (
                <button key={cat.id} onClick={() => setCategoryId(cat.id)} style={{
                  padding: '14px 8px', borderRadius: 16,
                  background: sel ? `${accent}22` : COLORS.surface2,
                  border: `1.5px solid ${sel ? `${accent}99` : COLORS.border}`,
                  color: sel ? accent : COLORS.textSecondary,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 22 }}>{cat.icon || categoryEmoji(cat.name)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{cat.name}</span>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
            {kind === 'income' ? 'Зачислить на счёт' : 'Списать со счёта'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {accounts.data?.map(a => {
              const sel = a.id === accountId
              return (
                <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 14,
                  background: sel ? COLORS.surface2 : `${COLORS.surface}88`,
                  border: `1.5px solid ${sel ? 'var(--accent)' : COLORS.border}`,
                  color: COLORS.textPrimary, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ color: 'var(--accent)' }}>{Icons.card(14)}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.bank_name} · {a.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{parseFloat(a.balance).toLocaleString('ru-RU')} {a.currency === 'RUB' ? '₽' : a.currency}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: confirmation */}
      {step === 3 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ padding: 18, borderRadius: 22, background: `${accent}12`, border: `1px solid ${accent}33`, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: accent, marginBottom: 8 }}>
              {kind === 'income' ? '+' : '−'}{formatAmount(parseFloat(amount) || 0)} ₽
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: COLORS.textSecondary }}>{kind === 'income' ? 'Источник' : 'Категория'}</span>
              <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{selectedCat?.name ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
              <span style={{ color: COLORS.textSecondary }}>Счёт</span>
              <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{selectedAccount ? `${selectedAccount.bank_name} · ${selectedAccount.name}` : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer button */}
      <div style={{ padding: '18px 20px 0' }}>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 ? !parseFloat(amount) : !categoryId}
            style={submitBtn(step === 1 ? !!parseFloat(amount) : !!categoryId, accent)}
          >
            Далее {Icons.chev(14)}
          </button>
        ) : (
          <button onClick={submit} disabled={mutation.isPending} style={submitBtn(!mutation.isPending, accent)}>
            {mutation.isPending ? 'Сохраняем...' : 'Подтвердить и сохранить'}
          </button>
        )}
      </div>
    </Modal>
  )
}

const iconBtn: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', color: COLORS.textSecondary, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10 }
const submitBtn = (active: boolean, accent: string): React.CSSProperties => ({
  width: '100%', padding: 15, background: active ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : COLORS.surface2,
  color: active ? '#0a0e1a' : COLORS.textSecondary, border: 0, borderRadius: 16, fontSize: 14.5,
  fontWeight: 700, cursor: active ? 'pointer' : 'default',
  boxShadow: active ? `0 10px 22px ${accent}40` : 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
})
