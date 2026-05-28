import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff, Plus, Minus } from 'lucide-react-native'
import { useHomeData } from './useHomeData'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'
import { formatAmount, formatCurrency, formatDate } from '@xnoll/shared'
import type { TransactionResponse, TransferResponse, CategoryResponse } from '@xnoll/shared'

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function currentMonthYear() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
}

type UnifiedEntry =
  | { kind: 'tx';       date: string; data: TransactionResponse }
  | { kind: 'transfer'; date: string; data: TransferResponse }

export function HomeScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const { accounts, transactions, transfers, categories, monthStats, totalBalance } = useHomeData()
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  const accountList = accounts.data ?? []
  const txList = transactions.data ?? []
  const transferList = transfers.data ?? []
  const categoryList = categories.data ?? []

  const catMap = Object.fromEntries(flatten(categoryList).map(c => [c.id, c]))
  const accountNameById = Object.fromEntries(accountList.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  const entries: UnifiedEntry[] = [
    ...txList.map(tx => ({ kind: 'tx' as const, date: tx.created_at, data: tx })),
    ...transferList.map(tr => ({ kind: 'transfer' as const, date: tr.created_at, data: tr })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)

  const monthIncome = parseFloat(monthStats.data?.total_income ?? '0')
  const monthExpense = Math.abs(parseFloat(monthStats.data?.total_expense ?? '0'))

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120, paddingHorizontal: 16, gap: 20 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Привет, {user?.full_name?.split(' ')[0] ?? ''}!</Text>
          <Text style={[styles.month, { color: colors.textPrimary }]}>{currentMonthYear()}</Text>
        </View>
        <TouchableOpacity onPress={toggleBalance}>
          {balanceVisible
            ? <Eye size={22} color={colors.textMuted} />
            : <EyeOff size={22} color={colors.textMuted} />
          }
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Общий баланс</Text>
        <Text style={[styles.balance, { color: colors.textPrimary }]}>
          {balanceVisible ? `${formatAmount(totalBalance)} ₽` : '••••••'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Plus size={14} color={colors.income} />
            <Text style={[styles.statVal, { color: colors.income }]}>{formatAmount(monthIncome)} ₽</Text>
          </View>
          <View style={styles.stat}>
            <Minus size={14} color={colors.expense} />
            <Text style={[styles.statVal, { color: colors.expense }]}>{formatAmount(monthExpense)} ₽</Text>
          </View>
        </View>
      </View>

      {/* Accounts strip */}
      {accountList.length > 0 && (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}>
          {accountList.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.accountChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openModal('account-detail', a)}
            >
              <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>{a.name}</Text>
              <Text style={[styles.accountBalance, { color: colors.accent }]}>
                {balanceVisible ? formatCurrency(parseFloat(a.balance), a.currency) : '••••'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Recent transactions */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>История</Text>
      {entries.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Нет транзакций</Text>
      )}
      {entries.map((entry) => {
        if (entry.kind === 'tx') {
          const tx = entry.data
          const cat = catMap[tx.category_id]
          const isIncome = tx.type === 'income'
          return (
            <TouchableOpacity
              key={tx.id}
              style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openModal('transaction-detail', tx)}
            >
              <View style={[styles.txIcon, { backgroundColor: colors.surface2 }]}>
                <Text style={styles.txIconText}>{cat?.icon ?? '📦'}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txName, { color: colors.textPrimary }]}>{cat?.name ?? 'Без категории'}</Text>
                <Text style={[styles.txSub, { color: colors.textMuted }]}>{accountNameById[tx.account_id] ?? ''}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.expense }]}>
                  {isIncome ? '+' : '-'}{formatAmount(parseFloat(tx.amount))} ₽
                </Text>
                <Text style={[styles.txDate, { color: colors.textMuted }]}>{formatDate(tx.date)}</Text>
              </View>
            </TouchableOpacity>
          )
        }
        const tr = entry.data
        const srcLabel = tr.source_label ?? accountNameById[tr.source_id ?? ''] ?? 'Внешний'
        const dstLabel = tr.dest_label ?? accountNameById[tr.dest_id ?? ''] ?? 'Внешний'
        return (
          <View
            key={tr.id}
            style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.txIcon, { backgroundColor: colors.surface2 }]}>
              <Text style={styles.txIconText}>↔️</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={[styles.txName, { color: colors.textPrimary }]}>{srcLabel} → {dstLabel}</Text>
              <Text style={[styles.txSub, { color: colors.textMuted }]}>Перевод</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: colors.textSecondary }]}>{formatCurrency(parseFloat(tr.amount), tr.currency)}</Text>
              <Text style={[styles.txDate, { color: colors.textMuted }]}>{formatDate(tr.date)}</Text>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontWeight: '500' },
  month: { fontSize: 22, fontWeight: '700' },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 6 },
  balanceLabel: { fontSize: 13 },
  balance: { fontSize: 36, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal: { fontSize: 14, fontWeight: '600' },
  accountChip: { marginRight: 10, borderRadius: 14, borderWidth: 1, padding: 12, minWidth: 130 },
  accountName: { fontSize: 13, fontWeight: '500' },
  accountBalance: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txName: { fontSize: 15, fontWeight: '500' },
  txSub: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '600' },
  txDate: { fontSize: 11, marginTop: 2 },
})
