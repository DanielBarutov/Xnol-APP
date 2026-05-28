import { useState, useEffect } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { useAccounts, useCreateTransfer } from './hooks/useAccounts'
import { COLORS } from '../../shared/tokens'

export function TransferModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'transfer'
  const { accounts, deposits } = useAccounts()
  const transfer = useCreateTransfer()

  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState<'savings_account' | 'deposit'>('savings_account')
  const [sourceId, setSourceId] = useState('')
  const [destType, setDestType] = useState<'savings_account' | 'deposit'>('savings_account')
  const [destId, setDestId] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) { setStep(1); setAmount(''); setSourceId(''); setDestId('') }
  }, [open])

  const sourceItems = sourceType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])
  const rawDestItems = destType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])
  const destItems = sourceType === destType
    ? rawDestItems.filter(item => item.id !== sourceId)
    : rawDestItems

  const submit = () => {
    if (!sourceId || !destId || !parseFloat(amount)) return
    transfer.mutate({
      source_type: sourceType,
      source_id: sourceId,
      dest_type: destType,
      dest_id: destId,
      amount: parseFloat(amount).toFixed(2),
      currency: 'RUB',
      date: new Date().toISOString().slice(0, 10),
    })
  }

  const KEYPAD = ['1','2','3','4','5','6','7','8','9','.','0','←']
  const onKey = (k: string) => {
    if (k === '←') return setAmount(a => a.slice(0, -1))
    if (k === '.' && amount.includes('.')) return
    if (amount.length >= 10) return
    setAmount(a => (a === '0' && k !== '.') ? k : a + k)
  }

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 18px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 4 }}>Перевод</div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 }}>Шаг {step} из 2</div>
      </div>

      {step === 1 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Откуда</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['savings_account', 'deposit'] as const).map(t => (
              <button key={t} onClick={() => { setSourceType(t); setSourceId('') }} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 600, background: sourceType === t ? 'var(--accent-tint)' : COLORS.surface2, border: `1.5px solid ${sourceType === t ? 'var(--accent)' : COLORS.border}`, color: sourceType === t ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer' }}>
                {t === 'savings_account' ? 'Счёт' : 'Вклад'}
              </button>
            ))}
          </div>
          {sourceItems.map(item => (
            <button key={item.id} onClick={() => setSourceId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 14, background: sourceId === item.id ? COLORS.surface2 : `${COLORS.surface}88`, border: `1.5px solid ${sourceId === item.id ? 'var(--accent)' : COLORS.border}`, color: COLORS.textPrimary, cursor: 'pointer', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.bank_name} · {item.name}</span>
            </button>
          ))}

          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Куда</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['savings_account', 'deposit'] as const).map(t => (
              <button key={t} onClick={() => { setDestType(t); setDestId('') }} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 600, background: destType === t ? 'var(--accent-tint)' : COLORS.surface2, border: `1.5px solid ${destType === t ? 'var(--accent)' : COLORS.border}`, color: destType === t ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer' }}>
                {t === 'savings_account' ? 'Счёт' : 'Вклад'}
              </button>
            ))}
          </div>
          {destItems.map(item => (
            <button key={item.id} onClick={() => setDestId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 14, background: destId === item.id ? COLORS.surface2 : `${COLORS.surface}88`, border: `1.5px solid ${destId === item.id ? 'var(--accent)' : COLORS.border}`, color: COLORS.textPrimary, cursor: 'pointer', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.bank_name} · {item.name}</span>
            </button>
          ))}

          <button onClick={() => setStep(2)} disabled={!sourceId || !destId} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 16, fontSize: 14, fontWeight: 700, background: (sourceId && destId) ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2, color: (sourceId && destId) ? '#fff' : COLORS.textSecondary, border: 0, cursor: (sourceId && destId) ? 'pointer' : 'default' }}>
            Далее ›
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ padding: '0 0 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: amount ? 'var(--accent)' : COLORS.textMuted }}>
              {amount || '0'} <span style={{ fontSize: 24, color: COLORS.textSecondary }}>₽</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
            {KEYPAD.map(k => (
              <button key={k} onClick={() => onKey(k)} style={{ padding: '14px 0', fontSize: 22, fontWeight: 600, background: COLORS.surface2, color: k === '←' ? COLORS.textSecondary : COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 14, cursor: 'pointer' }}>{k}</button>
            ))}
          </div>
          <button onClick={submit} disabled={!parseFloat(amount) || transfer.isPending} style={{ width: '100%', padding: 14, borderRadius: 16, fontSize: 14, fontWeight: 700, background: parseFloat(amount) ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2, color: parseFloat(amount) ? '#fff' : COLORS.textSecondary, border: 0, cursor: parseFloat(amount) ? 'pointer' : 'default' }}>
            {transfer.isPending ? 'Переводим...' : 'Подтвердить перевод'}
          </button>
        </div>
      )}
    </Modal>
  )
}
