import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { depositsApi } from '../../api/endpoints/deposits'
import { COLORS } from '../../shared/tokens'
import type { Currency } from '../../api/types'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']
const CUR_LABELS: Record<Currency, string> = { RUB: '₽ RUB', USD: '$ USD', EUR: '€ EUR' }

export function CreateDepositModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'create-deposit'
  const qc = useQueryClient()

  const [bankName, setBankName] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple')
  const [openDate, setOpenDate] = useState(new Date().toISOString().slice(0, 10))
  const [closeDate, setCloseDate] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [autoRenew, setAutoRenew] = useState(false)

  const mutation = useMutation({
    mutationFn: () => depositsApi.create({
      bank_name: bankName, name, amount: (parseFloat(amount) || 0).toFixed(2),
      interest_rate: (parseFloat(interestRate) || 0).toFixed(2),
      interest_type: interestType, open_date: openDate, close_date: closeDate,
      currency, auto_renew: autoRenew,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] })
      closeModal()
      showToast('Вклад создан', COLORS.income)
      setBankName(''); setName(''); setAmount(''); setInterestRate('')
      setCloseDate(''); setAutoRenew(false)
    },
    onError: () => showToast('Ошибка при создании вклада', COLORS.expense),
  })

  const canSubmit = bankName.trim() && name.trim() && amount && interestRate && closeDate && !mutation.isPending

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>Новый вклад</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={label}>Банк</div>
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Сбербанк" style={inputStyle} />
          </div>
          <div>
            <div style={label}>Название</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Вклад «Сохраняй»" style={inputStyle} />
          </div>
          <div>
            <div style={label}>Валюта</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: currency === c ? 'var(--accent-tint)' : COLORS.surface2,
                  border: `1.5px solid ${currency === c ? 'var(--accent)' : COLORS.border}`,
                  color: currency === c ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer',
                }}>{CUR_LABELS[c]}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>Сумма</div>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="100 000" inputMode="decimal" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>Ставка %</div>
              <input value={interestRate} onChange={e => setInterestRate(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="12.5" inputMode="decimal" style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={label}>Тип процентов</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['simple', 'compound'] as const).map(t => (
                <button key={t} onClick={() => setInterestType(t)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: interestType === t ? 'var(--accent-tint)' : COLORS.surface2,
                  border: `1.5px solid ${interestType === t ? 'var(--accent)' : COLORS.border}`,
                  color: interestType === t ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer',
                }}>{t === 'simple' ? 'Простые' : 'Сложные'}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>Дата открытия</div>
              <input type="date" value={openDate} onChange={e => setOpenDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>Дата закрытия</div>
              <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
          </div>
          <button onClick={() => setAutoRenew(v => !v)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 14, background: COLORS.surface2,
            border: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.textPrimary,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Автопролонгация</span>
            <div style={{ width: 44, height: 26, borderRadius: 99, background: autoRenew ? 'var(--accent)' : COLORS.border, position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: autoRenew ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </button>
        </div>

        <button onClick={() => mutation.mutate()} disabled={!canSubmit} style={{
          marginTop: 24, width: '100%', padding: 15, borderRadius: 16,
          background: canSubmit ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
          color: canSubmit ? '#0a0e1a' : COLORS.textSecondary, border: 0,
          fontSize: 14.5, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default',
          boxShadow: canSubmit ? '0 10px 22px var(--accent-shadow)' : 'none',
        }}>
          {mutation.isPending ? 'Создаём...' : 'Создать вклад'}
        </button>
      </div>
    </Modal>
  )
}

const label: React.CSSProperties = { fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 14,
  background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
  color: COLORS.textPrimary, fontSize: 15, fontWeight: 500,
  outline: 'none', boxSizing: 'border-box',
}
