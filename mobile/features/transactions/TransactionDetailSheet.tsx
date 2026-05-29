import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { accountsApi, categoriesApi, formatAmount, formatDate } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance } from '../../store/mutationQueue'
import type { TransactionResponse, CategoryResponse, AccountResponse } from '@xnoll/shared'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

function formatTxDate(isoDate: string): string {
  const today = new Date()
  const txDate = new Date(isoDate)
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
  return isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)
}

interface Props { transaction: TransactionResponse; onClose: () => void }

export function TransactionDetail({ transaction: tx, onClose }: Props) {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)
  const queueItems = useMutationQueue(s => s.items)
  const removeFromQueue = useMutationQueue(s => s.remove)
  const enqueue = useMutationQueue(s => s.add)
  const isIncome = tx.type === 'income'
  const amountColor = isIncome ? colors.income : colors.expense
  const [confirmVisible, setConfirmVisible] = useState(false)

  const isPending = queueItems.some(i => i.id === tx.id && i.type === 'transaction')

  const { data: serverAccounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list({ include_deleted: true }) })
  const { data: serverCategories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  // Merge server data with pending queue items so offline-created categories/accounts resolve
  const pendingCats: CategoryResponse[] = queueItems
    .filter((i): i is Extract<typeof i, { type: 'category_create' }> => i.type === 'category_create')
    .map(i => ({
      id: i.id, user_id: '', parent_id: i.payload.parent_id ?? null,
      name: i.payload.name, type: i.payload.type, icon: i.payload.icon ?? '',
      color: i.payload.color ?? '', is_system: false, children: [],
    }))
  const pendingAccounts: AccountResponse[] = queueItems
    .filter((i): i is Extract<typeof i, { type: 'account' }> => i.type === 'account')
    .map(i => ({
      id: i.id, user_id: '', name: i.payload.name, bank_name: i.payload.bank_name,
      balance: i.payload.balance, currency: i.payload.currency, created_at: i.queuedAt,
    }))

  const allCats = flatten([...serverCategories, ...pendingCats])
  const allAccounts = [...serverAccounts, ...pendingAccounts]

  const cat = allCats.find(c => c.id === tx.category_id)
  const account = allAccounts.find(a => a.id === tx.account_id)
  const accountName = account
    ? (account.bank_name ? `${account.bank_name} · ${account.name}` : account.name)
    : '—'

  function handleDelete() {
    setConfirmVisible(true)
  }

  function confirmDelete() {
    setConfirmVisible(false)
    if (isPending) {
      removeFromQueue(tx.id)
      patchBalance(qc, tx.account_id, isIncome ? -parseFloat(tx.amount) : parseFloat(tx.amount))
    } else {
      enqueue({ id: genId(), type: 'transaction_delete', payload: { id: tx.id } })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    }
    showToast('Операция удалена', '#6366f1')
    onClose()
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Детали операции</Text>

      <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Row label="Тип" value={isIncome ? 'Доход' : 'Расход'} colors={colors} />
        <Row
          label="Сумма"
          value={`${isIncome ? '+' : '−'}${formatAmount(Math.abs(parseFloat(tx.amount)))} ₽`}
          valueColor={amountColor}
          colors={colors}
        />
        <Row label="Категория" value={cat?.name ?? '—'} colors={colors} />
        <Row label="Счёт" value={accountName} colors={colors} />
        <Row label="Дата" value={formatTxDate(tx.date)} colors={colors} last />
      </View>

      {tx.description ? (
        <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Row label="Комментарий" value={tx.description} colors={colors} last />
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.deleteBtn, { borderColor: colors.expense + '66', backgroundColor: colors.expense + '11' }]}
        onPress={handleDelete}
      >
        <Text style={[styles.deleteTxt, { color: colors.expense }]}>Удалить операцию</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={confirmVisible}
        title="Удалить операцию"
        message="Это действие нельзя отменить."
        confirmLabel="Удалить"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  )
}

function Row({
  label, value, valueColor, colors, last = false,
}: {
  label: string
  value: string
  valueColor?: string
  colors: ReturnType<typeof useTheme>
  last?: boolean
}) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 13 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  deleteBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  deleteTxt: { fontWeight: '700', fontSize: 15 },
})
