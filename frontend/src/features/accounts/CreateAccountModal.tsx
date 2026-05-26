import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { accountsApi } from '../../api/endpoints/accounts'
import { COLORS } from '../../shared/tokens'
import type { Currency } from '../../api/types'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']
const CUR_LABELS: Record<Currency, string> = { RUB: '₽ RUB', USD: '$ USD', EUR: '€ EUR' }

export function CreateAccountModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'create-account'
  const qc = useQueryClient()

  const [bankName, setBankName] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [balance, setBalance] = useState('')

  const mutation = useMutation({
    mutationFn: () => accountsApi.create({ bank_name: bankName, name, currency, balance: (parseFloat(balance) || 0).toFixed(2) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      closeModal()
      showToast('Счёт создан', COLORS.income)
      setBankName(''); setName(''); setBalance(''); setCurrency('RUB')
    },
    onError: () => showToast('Ошибка при создании счёта', COLORS.expense),
  })

  const canSubmit = bankName.trim() && name.trim() && !mutation.isPending

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>Новый счёт</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={label}>Банк</div>
            <input
              value={bankName} onChange={e => setBankName(e.target.value)}
              placeholder="Сбербанк"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={label}>Название</div>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Основной"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={label}>Валюта</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: currency === c ? 'var(--accent-tint)' : COLORS.surface2,
                  border: `1.5px solid ${currency === c ? 'var(--accent)' : COLORS.border}`,
                  color: currency === c ? 'var(--accent)' : COLORS.textSecondary,
                  cursor: 'pointer',
                }}>{CUR_LABELS[c]}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={label}>Начальный баланс</div>
            <input
              value={balance} onChange={e => setBalance(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          style={{
            marginTop: 24, width: '100%', padding: 15, borderRadius: 16,
            background: canSubmit ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
            color: canSubmit ? '#0a0e1a' : COLORS.textSecondary,
            border: 0, fontSize: 14.5, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default',
            boxShadow: canSubmit ? '0 10px 22px var(--accent-shadow)' : 'none',
          }}
        >
          {mutation.isPending ? 'Создаём...' : 'Создать счёт'}
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
