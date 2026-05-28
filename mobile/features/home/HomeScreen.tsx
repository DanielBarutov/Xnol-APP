import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff, Plus, Minus, CreditCard } from 'lucide-react-native'
import { useHomeData } from './useHomeData'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'
import { formatAmount, formatCurrency, formatDate } from '@xnoll/shared'
import { DynIcon } from '../../components/DynIcon'
import { useMutationQueue } from '../../store/mutationQueue'
import type { TransactionResponse, TransferResponse, CategoryResponse } from '@xnoll/shared'

const TAG_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e',
  '#f97316','#f59e0b','#10b981','#14b8a6','#06b6d4',
  '#3b82f6','#0ea5e9',
]

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function currentMonthYear() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
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

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
}

type UnifiedEntry =
  | { kind: 'tx';               date: string; data: TransactionResponse }
  | { kind: 'transfer';         date: string; data: TransferResponse }
  | { kind: 'pending-tx';       date: string; categoryId: string; accountId: string; txType: 'income' | 'expense'; amount: string }
  | { kind: 'pending-transfer'; date: string; sourceId: string; destId: string; amount: string; currency: string }

export function HomeScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const { accounts, transactions, transfers, categories, monthStats, totalBalance } = useHomeData()
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)
  const [activeCard, setActiveCard] = useState(0)

  const accountList = accounts.data ?? []
  const txList = transactions.data ?? []
  const transferList = transfers.data ?? []
  const categoryList = categories.data ?? []
  const queueItems = useMutationQueue(s => s.items)

  const allCats = flatten(categoryList)
  const catMap = Object.fromEntries(allCats.map(c => [c.id, c]))
  const accountNameById = Object.fromEntries(accountList.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  const pendingEntries: UnifiedEntry[] = queueItems
    .filter((i): i is Exclude<typeof i, { type: 'account' }> => i.type === 'transaction' || i.type === 'transfer')
    .map(i => i.type === 'transaction'
      ? { kind: 'pending-tx' as const, date: i.queuedAt, categoryId: i.payload.category_id, accountId: i.payload.account_id, txType: i.payload.type as 'income' | 'expense', amount: i.payload.amount }
      : { kind: 'pending-transfer' as const, date: i.queuedAt, sourceId: i.payload.source_id ?? '', destId: i.payload.dest_id ?? '', amount: i.payload.amount, currency: i.payload.currency }
    )

  const entries: UnifiedEntry[] = [
    ...pendingEntries,
    ...txList.map(tx => ({ kind: 'tx' as const, date: tx.created_at, data: tx })),
    ...transferList.map(tr => ({ kind: 'transfer' as const, date: tr.created_at, data: tr })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  const monthIncome = parseFloat(monthStats.data?.total_income ?? '0')
  const monthExpense = Math.abs(parseFloat(monthStats.data?.total_expense ?? '0'))

  const firstLetter = user?.full_name?.charAt(0)?.toUpperCase() ?? '?'

  function onAccountScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (accountList.length === 0) return
    const x = e.nativeEvent.contentOffset.x
    const width = e.nativeEvent.layoutMeasurement.width
    const idx = Math.round(x / width)
    setActiveCard(Math.min(Math.max(idx, 0), accountList.length - 1))
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 20 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Добро пожаловать</Text>
          <Text style={[styles.month, { color: colors.textPrimary }]}>{currentMonthYear()}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleBalance} style={[styles.iconBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            {balanceVisible ? <Eye size={18} color={colors.textSecondary} /> : <EyeOff size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
        </View>
      </View>

      {/* Balance card — gradient */}
      <LinearGradient
        colors={[colors.accent2, colors.accent, colors.accent3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.balanceCard, { marginHorizontal: 20, marginTop: 20 }]}
      >
        <View style={styles.balanceCardTop}>
          <Text style={styles.balanceLabelSmall}>ОБЩИЙ БАЛАНС</Text>
          <View style={[styles.currencyBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.currencyBadgeText}>RUB</Text>
          </View>
        </View>

        <Text style={styles.balanceAmount}>
          {balanceVisible ? `₽ ${formatAmount(totalBalance)}` : '₽ ••••••'}
        </Text>

        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>↑ ДОХОДЫ</Text>
            <Text style={styles.statValIncome}>{formatAmount(monthIncome)} ₽</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>↓ РАСХОДЫ</Text>
            <Text style={styles.statValExpense}>{formatAmount(monthExpense)} ₽</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick action buttons */}
      <View style={[styles.quickActions, { paddingHorizontal: 20, marginTop: 16 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.income + '66' }]}
          onPress={() => openModal('add-tx', { kind: 'income' })}
        >
          <Plus size={20} color={colors.income} />
          <Text style={[styles.actionBtnText, { color: colors.income }]}>Доход</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.expense + '66' }]}
          onPress={() => openModal('add-tx', { kind: 'expense' })}
        >
          <Minus size={20} color={colors.expense} />
          <Text style={[styles.actionBtnText, { color: colors.expense }]}>Расход</Text>
        </TouchableOpacity>
      </View>

      {/* Accounts section */}
      {accountList.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>СЧЕТА</Text>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onAccountScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
            style={{ marginTop: 14 }}
          >
            {accountList.map((account, idx) => {
              const dotColor = TAG_COLORS[idx % TAG_COLORS.length]
              const balance = parseFloat(account.balance)
              const currencySymbol = account.currency === 'RUB' ? '₽' : account.currency === 'USD' ? '$' : '€'
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={() => openModal('account-detail', account)}
                >
                  <View style={styles.accountCardTop}>
                    <View style={styles.accountDotRow}>
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                      <Text style={[styles.accountBankName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {account.bank_name ?? account.name}
                      </Text>
                    </View>
                    <CreditCard size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.accountBalance, { color: colors.textPrimary }]}>
                    {balanceVisible ? `${balance.toLocaleString('ru-RU')} ${currencySymbol}` : '••••••'}
                  </Text>
                  <Text style={[styles.accountSubName, { color: colors.income }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          {accountList.length > 1 && (
            <View style={styles.dotIndicators}>
              {accountList.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dotIndicator,
                    {
                      width: idx === activeCard ? 16 : 6,
                      backgroundColor: idx === activeCard ? colors.accent : 'rgba(255,255,255,0.2)',
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recent transactions */}
      <View style={{ marginTop: 28, paddingHorizontal: 20, flex: 1 }}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ПОСЛЕДНИЕ</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity onPress={() => openModal('all-transactions')}>
              <Text style={[styles.seeAll, { color: colors.accent }]}>Все →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              onPress={() => openModal('all-transactions')}
            >
              <DynIcon name="Filter" size={13} color={colors.textSecondary} />
              <Text style={[styles.filterBtnText, { color: colors.textSecondary }]}>Фильтр</Text>
            </TouchableOpacity>
          </View>
        </View>

        {entries.length === 0 && !transactions.isLoading && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Операций пока нет</Text>
        )}

        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1
          if (entry.kind === 'pending-tx') {
            const cat = catMap[entry.categoryId]
            const catColor = cat?.color ?? '#6366f1'
            const isIncome = entry.txType === 'income'
            const catName = cat?.name ?? 'Без категории'
            const accName = accountNameById[entry.accountId] ?? ''
            const direction = isIncome ? `${catName} → ${accName}` : `${accName} → ${catName}`
            return (
              <View key={`pending-tx-${entry.date}`} style={[styles.txRow, { opacity: 0.6, borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
                <View style={[styles.txIcon, { backgroundColor: catColor + '22' }]}>
                  <DynIcon name={cat?.icon ?? 'Package'} size={18} color={catColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.textPrimary }]} numberOfLines={1}>{direction}</Text>
                  <Text style={[styles.txSub, { color: colors.textSecondary }]}>Синхронизируется...</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.expense }]}>
                    {balanceVisible ? `${isIncome ? '+' : '−'}${formatAmount(Math.abs(parseFloat(entry.amount)))} ₽` : '••••••'}
                  </Text>
                  <DynIcon name="Clock" size={10} color={colors.textMuted} />
                </View>
              </View>
            )
          }
          if (entry.kind === 'pending-transfer') {
            const srcName = accountNameById[entry.sourceId] ?? 'Счёт'
            const dstName = accountNameById[entry.destId] ?? 'Счёт'
            return (
              <View key={`pending-tr-${entry.date}`} style={[styles.txRow, { opacity: 0.6, borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
                <View style={[styles.txIcon, { backgroundColor: colors.accentTint }]}>
                  <DynIcon name="ArrowRightLeft" size={18} color={colors.accent} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.textPrimary }]} numberOfLines={1}>{srcName} → {dstName}</Text>
                  <Text style={[styles.txSub, { color: colors.textSecondary }]}>Синхронизируется...</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.txAmount, { color: colors.textSecondary }]}>
                    {balanceVisible ? `${formatCurrency(parseFloat(entry.amount), entry.currency as any)}` : '••••••'}
                  </Text>
                  <DynIcon name="Clock" size={10} color={colors.textMuted} />
                </View>
              </View>
            )
          }
          if (entry.kind === 'tx') {
            const tx = entry.data
            const cat = catMap[tx.category_id]
            const catColor = cat?.color ?? '#6366f1'
            const iconName = cat?.icon ?? 'Package'
            const catName = cat?.name ?? 'Без категории'
            const accName = accountNameById[tx.account_id] ?? ''
            const isIncome = tx.type === 'income'
            const direction = isIncome ? `${catName} → ${accName}` : `${accName} → ${catName}`
            return (
              <TouchableOpacity
                key={`tx-${tx.id}`}
                style={[styles.txRow, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}
                onPress={() => openModal('transaction-detail', tx)}
              >
                <View style={[styles.txIcon, { backgroundColor: catColor + '33' }]}>
                  <DynIcon name={iconName} size={18} color={catColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.textPrimary }]} numberOfLines={1}>{direction}</Text>
                  <Text style={[styles.txSub, { color: colors.textSecondary }]}>{formatTxDate(tx.date, tx.created_at)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.expense }]}>
                  {balanceVisible
                    ? `${isIncome ? '+' : '−'}${formatAmount(Math.abs(parseFloat(tx.amount)))} ₽`
                    : '••••••'}
                </Text>
              </TouchableOpacity>
            )
          }
          const tr = entry.data
          const srcName = tr.source_id ? (accountNameById[tr.source_id] ?? tr.source_label ?? 'Счёт') : (tr.source_label ?? 'Внешний')
          const dstName = tr.dest_id   ? (accountNameById[tr.dest_id]   ?? tr.dest_label   ?? 'Счёт') : (tr.dest_label   ?? 'Внешний')
          return (
            <View
              key={`tr-${tr.id}`}
              style={[styles.txRow, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}
            >
              <View style={[styles.txIcon, { backgroundColor: colors.accentTint }]}>
                <DynIcon name="ArrowRightLeft" size={18} color={colors.accent} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txName, { color: colors.textPrimary }]} numberOfLines={1}>{srcName} → {dstName}</Text>
                <Text style={[styles.txSub, { color: colors.textSecondary }]}>{formatTxDate(tr.date, tr.created_at)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: colors.textSecondary }]}>
                {balanceVisible ? `${formatCurrency(parseFloat(tr.amount), tr.currency)}` : '••••••'}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  month: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  balanceCard: { borderRadius: 28, padding: 22, overflow: 'hidden', alignSelf: 'stretch', flexShrink: 0 },
  balanceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceLabelSmall: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 1.2 },
  currencyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  currencyBadgeText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: -1.5, lineHeight: 44, marginBottom: 18 },
  divider: { height: 1, marginBottom: 5 },
  statsRow: { flexDirection: 'row' },
  statCol: { flex: 1 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
  statValIncome: { fontSize: 15, fontWeight: '700', color: '#a7f3d0' },
  statValExpense: { fontSize: 15, fontWeight: '700', color: '#fca5a5' },

  quickActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontWeight: '600' },

  accountCard: { width: 260, borderRadius: 20, borderWidth: 1, padding: 18 },
  accountCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  accountDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  accountBankName: { fontSize: 14, fontWeight: '600' },
  accountBalance: { fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  accountSubName: { fontSize: 13, fontWeight: '600' },

  dotIndicators: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dotIndicator: { height: 6, borderRadius: 3 },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontSize: 14, fontWeight: '600' },
  txSub: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700', flexShrink: 0 },

  empty: { textAlign: 'center', marginTop: 32, fontSize: 13 },
})
