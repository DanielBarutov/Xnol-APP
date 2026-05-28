import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { depositsApi } from '../../api/endpoints/deposits'
import { formatCurrency } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'
import type { DepositResponse } from '../../api/types'

function calcYield(d: DepositResponse): { yieldAmt: number; projectedBalance: number } | null {
  const today = new Date()
  const closeDate = new Date(d.close_date)
  const daysUntilClose = Math.max(0, Math.floor((closeDate.getTime() - today.getTime()) / 86_400_000))
  const months = Math.max(1, Math.round(daysUntilClose / 30.44))
  const rate = parseFloat(d.interest_rate) / 100
  const balance = parseFloat(d.balance)
  if (isNaN(rate) || isNaN(balance) || balance <= 0) return null
  let yieldAmt: number
  if (d.interest_type === 'simple') {
    yieldAmt = balance * rate * (months / 12)
  } else {
    yieldAmt = balance * Math.pow(1 + rate / 12, months) - balance
  }
  return { yieldAmt, projectedBalance: balance + yieldAmt }
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 14, fontSize: 14,
  background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
  color: COLORS.textPrimary, boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: COLORS.textSecondary, fontWeight: 600,
  marginBottom: 6, display: 'block',
}

export function DepositDetailModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'deposit-detail'
  const depositId = (modal.payload as { depositId?: string })?.depositId
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bankName, setBankName] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)

  const { data, isError, isLoading } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
    retry: 1,
  })

  useEffect(() => {
    if (data) {
      setName(data.name)
      setBankName(data.bank_name)
      setInterestRate(data.interest_rate)
      setCloseDate(data.close_date)
      setAutoRenew(data.auto_renew)
    }
  }, [data])

  useEffect(() => {
    if (!open) setEditing(false)
  }, [open])

  const updateMutation = useMutation({
    mutationFn: () => depositsApi.update(depositId!, { name, bank_name: bankName, interest_rate: interestRate, close_date: closeDate, auto_renew: autoRenew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      showToast('Вклад обновлён', COLORS.income)
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => depositsApi.delete(depositId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      showToast('Вклад удалён', COLORS.expense)
      closeModal()
    },
  })

  const rows = data ? [
    ['Банк', data.bank_name],
    ['Сумма', formatCurrency(parseFloat(data.amount), data.currency)],
    ['Баланс', formatCurrency(parseFloat(data.balance), data.currency)],
    ['Ставка', `${data.interest_rate}% (${data.interest_type === 'compound' ? 'сложные' : 'простые'})`],
    ['Открыт', data.open_date],
    ['Закрыть', data.close_date],
    ['Автопролонгация', data.auto_renew ? 'Да' : 'Нет'],
    ['Статус', data.status],
  ] as [string, string][] : []

  const yieldResult = data ? calcYield(data) : null

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
            {editing ? 'Редактировать' : 'Детали вклада'}
          </div>
          {data && !editing && (
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Изменить
            </button>
          )}
        </div>

        {/* Detail view */}
        {!editing && data && (
          <>
            <div style={{ background: COLORS.surface2, borderRadius: 16, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              {rows.map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none', fontSize: 13 }}>
                  <span style={{ color: COLORS.textSecondary }}>{k}</span>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {yieldResult && (
              <div style={{ marginTop: 16, background: COLORS.surface2, borderRadius: 16, padding: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Ожидаемый доход
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Доход</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.income }}>
                    +{formatCurrency(yieldResult.yieldAmt, data.currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Итог</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                    {formatCurrency(yieldResult.projectedBalance, data.currency)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => { if (window.confirm(`Удалить вклад «${data.name}»?`)) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
              style={{ marginTop: 20, width: '100%', padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 700, background: `${COLORS.expense}18`, border: `1px solid ${COLORS.expense}44`, color: COLORS.expense, cursor: 'pointer' }}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить вклад'}
            </button>
          </>
        )}

        {/* Edit form */}
        {editing && data && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Название</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Банк</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Процентная ставка (%)</label>
              <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Дата закрытия</label>
              <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Автопролонгация</label>
              <button onClick={() => setAutoRenew(v => !v)} style={{ width: 44, height: 26, borderRadius: 99, background: autoRenew ? 'var(--accent)' : COLORS.border, border: 0, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: autoRenew ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 600, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()} style={{ flex: 2, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 700, background: 'var(--accent)', border: 0, color: '#fff', cursor: 'pointer', opacity: !name.trim() ? 0.5 : 1 }}>
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}

        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка...</div>
        )}
        {isError && (
          <div style={{ color: COLORS.expense, fontSize: 13 }}>Не удалось загрузить детали вклада</div>
        )}
      </div>
    </Modal>
  )
}
