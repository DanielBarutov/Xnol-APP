import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { DynIcon } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'
import { formatDate } from '../../shared/lib/format'
import { useQuery as useCatQuery } from '@tanstack/react-query'
import { categoriesApi } from '../../api/endpoints/categories'
import type { CategoryResponse } from '../../api/types'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

export function AllTransactionsModal() {
  const { modal, closeModal, balanceVisible } = useUIStore()
  const open = modal.type === 'all-transactions'

  const { data: txList = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: transactionsApi.list,
    enabled: open,
  })

  const { data: categories = [] } = useCatQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: open,
  })

  const allCats = flatten(categories)

  function getCategoryIcon(categoryId: string): string {
    return allCats.find(c => c.id === categoryId)?.icon ?? 'Package'
  }

  function getCategoryColor(categoryId: string): string {
    return allCats.find(c => c.id === categoryId)?.color ?? '#6366f1'
  }

  function formatTxDate(isoDate: string, isoCreatedAt: string): string {
    const today = new Date()
    const txDate = new Date(isoDate)
    const time = isoCreatedAt.slice(11, 16)
    const isToday =
      txDate.getFullYear() === today.getFullYear() &&
      txDate.getMonth() === today.getMonth() &&
      txDate.getDate() === today.getDate()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const isYesterday =
      txDate.getFullYear() === yesterday.getFullYear() &&
      txDate.getMonth() === yesterday.getMonth() &&
      txDate.getDate() === yesterday.getDate()
    const label = isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)
    return `${label}, ${time}`
  }

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          Все операции
        </div>

        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: '12px 0' }}>Загрузка...</div>
        )}

        {txList.map(tx => {
          const iconName = getCategoryIcon(tx.category_id)
          const catColor = getCategoryColor(tx.category_id)
          const isIncome = tx.type === 'income'
          const amtColor = isIncome ? COLORS.income : COLORS.expense
          const amtPrefix = isIncome ? '+' : '−'
          const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')

          return (
            <div
              key={tx.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: `${catColor}22`, border: `1px solid ${catColor}44`,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <DynIcon name={iconName} size={18} color={catColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: COLORS.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {tx.description || 'Операция'}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {formatTxDate(tx.date, tx.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
                {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
              </div>
            </div>
          )
        })}

        {!isLoading && txList.length === 0 && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Операций пока нет
          </div>
        )}
      </div>
    </Modal>
  )
}
