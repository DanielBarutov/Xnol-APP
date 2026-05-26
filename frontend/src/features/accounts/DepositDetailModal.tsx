import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { depositsApi } from '../../api/endpoints/deposits'
import { formatCurrency } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'

export function DepositDetailModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'deposit-detail'
  const depositId = (modal.payload as { depositId?: string })?.depositId

  const { data } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
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

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>Детали вклада</div>
        {data && (
          <div style={{ background: COLORS.surface2, borderRadius: 16, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none', fontSize: 13 }}>
                <span style={{ color: COLORS.textSecondary }}>{k}</span>
                <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {!data && <div style={{ color: COLORS.textSecondary }}>Загрузка...</div>}
      </div>
    </Modal>
  )
}
