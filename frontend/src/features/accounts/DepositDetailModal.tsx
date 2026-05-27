import { useQuery } from '@tanstack/react-query'
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

export function DepositDetailModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'deposit-detail'
  const depositId = (modal.payload as { depositId?: string })?.depositId

  const { data, isError, isLoading } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
    retry: 1,
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
  ] : []

  const yieldResult = data ? calcYield(data) : null

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>Детали вклада</div>
        {data && (
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
