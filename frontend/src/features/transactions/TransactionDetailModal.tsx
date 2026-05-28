import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { COLORS } from '../../shared/tokens'
import { formatDate } from '../../shared/lib/format'
import type { TransactionResponse } from '../../api/types'

export function TransactionDetailModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'transaction-detail'
  const tx = (modal.payload as { tx?: TransactionResponse; categoryName?: string; accountName?: string })
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => transactionsApi.delete(tx.tx!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      showToast('Операция удалена', COLORS.expense)
      closeModal()
    },
  })

  if (!tx?.tx) return null

  const { tx: t, categoryName = '—', accountName = '—' } = tx
  const isIncome = t.type === 'income'
  const amtColor = isIncome ? COLORS.income : COLORS.expense
  const amtPrefix = isIncome ? '+' : '−'
  const amt = Math.abs(parseFloat(t.amount)).toLocaleString('ru-RU')

  const rows: [string, string][] = [
    ['Тип', isIncome ? 'Доход' : 'Расход'],
    ['Сумма', `${amtPrefix}${amt} ₽`],
    ['Категория', categoryName],
    ['Счёт', accountName],
    ['Дата', formatDate(t.date)],
  ]
  if (t.description) rows.push(['Описание', t.description])

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>Детали операции</div>

        <div style={{ background: COLORS.surface2, borderRadius: 16, overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none', fontSize: 13 }}>
              <span style={{ color: COLORS.textSecondary }}>{k}</span>
              <span style={{ color: k === 'Сумма' ? amtColor : COLORS.textPrimary, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            if (window.confirm('Удалить эту операцию?')) deleteMutation.mutate()
          }}
          disabled={deleteMutation.isPending}
          style={{
            width: '100%', padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 700,
            background: `${COLORS.expense}18`, border: `1px solid ${COLORS.expense}44`,
            color: COLORS.expense, cursor: 'pointer',
          }}
        >
          {deleteMutation.isPending ? 'Удаление...' : 'Удалить операцию'}
        </button>
      </div>
    </Modal>
  )
}
