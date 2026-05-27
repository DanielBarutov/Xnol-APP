import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { transfersApi } from '../../api/endpoints/transfers'
import { accountsApi } from '../../api/endpoints/accounts'
import { DynIcon } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'
import { formatDate } from '../../shared/lib/format'
import { categoriesApi } from '../../api/endpoints/categories'
import type { CategoryResponse, TransactionResponse, TransferResponse } from '../../api/types'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
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

type Entry =
  | { kind: 'tx';       date: string; data: TransactionResponse }
  | { kind: 'transfer'; date: string; data: TransferResponse }

export function AllTransactionsModal() {
  const { modal, closeModal, balanceVisible } = useUIStore()
  const open = modal.type === 'all-transactions'

  const { data: txList = [],       isLoading: txLoading }   = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list(), enabled: open })
  const { data: transferList = [], isLoading: trLoading }   = useQuery({ queryKey: ['transfers'],   queryFn: () => transfersApi.list(),   enabled: open })
  const { data: categories = [] }                           = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list,           enabled: open })
  const { data: accounts = [] }                             = useQuery({ queryKey: ['accounts'],    queryFn: accountsApi.list,             enabled: open })

  const allCats = flatten(categories)
  const accountNameById = Object.fromEntries(accounts.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  const entries: Entry[] = [
    ...txList.map(t => ({ kind: 'tx' as const,       date: t.date, data: t })),
    ...transferList.map(t => ({ kind: 'transfer' as const, date: t.date, data: t })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const isLoading = txLoading || trLoading

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          Все операции
        </div>

        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: '12px 0' }}>Загрузка...</div>
        )}

        {entries.map(entry => {
          if (entry.kind === 'tx') {
            const tx = entry.data
            const cat = allCats.find(c => c.id === tx.category_id)
            const iconName = cat?.icon ?? 'Package'
            const catColor = cat?.color ?? '#6366f1'
            const catName  = cat?.name ?? 'Категория'
            const accName  = accountNameById[tx.account_id] ?? 'Счёт'
            const isIncome  = tx.type === 'income'
            const amtColor  = isIncome ? COLORS.income : COLORS.expense
            const amtPrefix = isIncome ? '+' : '−'
            const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')
            const direction = isIncome ? `${catName} → ${accName}` : `${accName} → ${catName}`

            return (
              <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <DynIcon name={iconName} size={18} color={catColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {direction}
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
          }

          const tr = entry.data
          const srcName = tr.source_id ? (accountNameById[tr.source_id] ?? tr.source_label ?? 'Счёт') : (tr.source_label ?? 'Внешний')
          const dstName = tr.dest_id   ? (accountNameById[tr.dest_id]   ?? tr.dest_label   ?? 'Счёт') : (tr.dest_label   ?? 'Внешний')
          const amt = Math.abs(parseFloat(tr.amount)).toLocaleString('ru-RU')

          return (
            <div key={`tr-${tr.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--accent-tint)', border: '1px solid var(--accent)44', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <DynIcon name="ArrowRightLeft" size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {srcName} → {dstName}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {formatTxDate(tr.date, tr.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textSecondary, flexShrink: 0 }}>
                {balanceVisible ? `${amt} ₽` : '••••••'}
              </div>
            </div>
          )
        })}

        {!isLoading && entries.length === 0 && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Операций пока нет
          </div>
        )}
      </div>
    </Modal>
  )
}
