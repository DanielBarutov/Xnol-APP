import { forwardRef, useState, useCallback, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi, transfersApi, accountsApi, categoriesApi } from '@xnoll/shared'
import { formatAmount, formatCurrency, formatDate } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue } from '../../store/mutationQueue'
import { DynIcon } from '../../components/DynIcon'
import type { CategoryResponse } from '@xnoll/shared'

function todayDisplay(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const SNAP_POINTS = ['90%']

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
  return `${isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)}, ${time}`
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

function toISO(display: string): string | undefined {
  const m = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return undefined
  return `${m[3]}-${m[2]}-${m[1]}`
}

interface Props {
  onClose?: () => void
}

export const AllTransactionsSheet = forwardRef<BottomSheet, Props>(({ onClose }, ref) => {
  const colors = useTheme()
  const balanceVisible = useUIStore(s => s.balanceVisible)
  const openModal = useUIStore(s => s.openModal)
  const queueItems = useMutationQueue(s => s.items)

  const today = todayDisplay()
  const [fromDisplay, setFromDisplay] = useState(today)
  const [toDisplay, setToDisplay] = useState(today)

  const fromISO = toISO(fromDisplay)
  const toISO_ = toISO(toDisplay)

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'all', fromISO, toISO_],
    queryFn: () => transactionsApi.list({ date_from: fromISO, date_to: toISO_, limit: 500 }),
  })
  const { data: transfers = [] } = useQuery({ queryKey: ['transfers'], queryFn: transfersApi.list })
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const allCats = flatten(categories)
  const catMap = Object.fromEntries(allCats.map(c => [c.id, c]))
  const accountNameById = Object.fromEntries(
    accounts.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]),
  )

  const entries = useMemo(() => {
    const filteredTransfers = transfers.filter(tr => {
      const d = tr.date
      if (fromISO && d < fromISO) return false
      if (toISO_ && d > toISO_) return false
      return true
    })
    const pending = queueItems
      .filter((item): item is Exclude<typeof item, { type: 'account' }> => {
        if (item.type === 'account') return false
        const d = item.payload.date
        if (fromISO && d < fromISO) return false
        if (toISO_ && d > toISO_) return false
        return true
      })
      .map(item => ({ kind: 'pending' as const, date: item.queuedAt, item }))
    return [
      ...pending,
      ...transactions.map(tx => ({ kind: 'tx' as const, date: tx.created_at, data: tx })),
      ...filteredTransfers.map(tr => ({ kind: 'transfer' as const, date: tr.created_at, data: tr })),
    ].sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, transfers, queueItems, fromISO, toISO_])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  )

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onClose}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 20, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Все операции</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <DynIcon name="X" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Date filter */}
      <View style={[styles.filterRow, { paddingHorizontal: 20, marginTop: 12 }]}>
        <View style={[styles.dateInput, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <DynIcon name="Calendar" size={14} color={colors.textMuted} />
          <TextInput
            style={[styles.dateText, { color: colors.textPrimary }]}
            placeholder="дд.мм.гггг"
            placeholderTextColor={colors.textMuted}
            value={fromDisplay}
            onChangeText={v => setFromDisplay(applyDateMask(v))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <Text style={[styles.dash, { color: colors.textMuted }]}>—</Text>
        <View style={[styles.dateInput, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <DynIcon name="Calendar" size={14} color={colors.textMuted} />
          <TextInput
            style={[styles.dateText, { color: colors.textPrimary }]}
            placeholder="дд.мм.гггг"
            placeholderTextColor={colors.textMuted}
            value={toDisplay}
            onChangeText={v => setToDisplay(applyDateMask(v))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {entries.length === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Операций не найдено</Text>
        )}

        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1
          if (entry.kind === 'pending') {
            const { item } = entry
            if (item.type === 'transaction') {
              const cat = catMap[item.payload.category_id]
              const catColor = cat?.color ?? '#6366f1'
              const isIncome = item.payload.type === 'income'
              const direction = isIncome
                ? `${cat?.name ?? 'Без категории'} → ${accountNameById[item.payload.account_id] ?? ''}`
                : `${accountNameById[item.payload.account_id] ?? ''} → ${cat?.name ?? 'Без категории'}`
              return (
                <View key={`pending-${item.id}`} style={[styles.row, { opacity: 0.6, borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
                  <View style={[styles.icon, { backgroundColor: catColor + '22' }]}>
                    <DynIcon name={cat?.icon ?? 'Package'} size={18} color={catColor} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{direction}</Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>Синхронизируется...</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
                      {balanceVisible ? `${isIncome ? '+' : '−'}${formatAmount(Math.abs(parseFloat(item.payload.amount)))} ₽` : '••••••'}
                    </Text>
                    <DynIcon name="Clock" size={10} color={colors.textMuted} />
                  </View>
                </View>
              )
            }
            const srcName = item.payload.source_id ? (accountNameById[item.payload.source_id] ?? 'Счёт') : 'Счёт'
            const dstName = item.payload.dest_id ? (accountNameById[item.payload.dest_id] ?? 'Счёт') : 'Счёт'
            return (
              <View key={`pending-${item.id}`} style={[styles.row, { opacity: 0.6, borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
                <View style={[styles.icon, { backgroundColor: colors.accentTint }]}>
                  <DynIcon name="ArrowRightLeft" size={18} color={colors.accent} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{srcName} → {dstName}</Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>Синхронизируется...</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.amount, { color: colors.textSecondary }]}>
                    {balanceVisible ? formatCurrency(parseFloat(item.payload.amount), item.payload.currency) : '••••••'}
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
              <Pressable
                key={`tx-${tx.id}`}
                style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}
                onPress={() => openModal('transaction-detail', tx)}
              >
                <View style={[styles.icon, { backgroundColor: catColor + '33' }]}>
                  <DynIcon name={iconName} size={18} color={catColor} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{direction}</Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>{formatTxDate(tx.date, tx.created_at)}</Text>
                </View>
                <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
                  {balanceVisible
                    ? `${isIncome ? '+' : '−'}${formatAmount(Math.abs(parseFloat(tx.amount)))} ₽`
                    : '••••••'}
                </Text>
              </Pressable>
            )
          }
          const tr = entry.data
          const srcName = tr.source_id
            ? (accountNameById[tr.source_id] ?? tr.source_label ?? 'Счёт')
            : (tr.source_label ?? 'Внешний')
          const dstName = tr.dest_id
            ? (accountNameById[tr.dest_id] ?? tr.dest_label ?? 'Счёт')
            : (tr.dest_label ?? 'Внешний')
          return (
            <View
              key={`tr-${tr.id}`}
              style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.accentTint }]}>
                <DynIcon name="ArrowRightLeft" size={18} color={colors.accent} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{srcName} → {dstName}</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>{formatTxDate(tr.date, tr.created_at)}</Text>
              </View>
              <Text style={[styles.amount, { color: colors.textSecondary }]}>
                {balanceVisible ? formatCurrency(parseFloat(tr.amount), tr.currency) : '••••••'}
              </Text>
            </View>
          )
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4, borderBottomWidth: 0,
  },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  dateText: { flex: 1, fontSize: 13, fontWeight: '500' },
  dash: { fontSize: 16, fontWeight: '600' },

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1, gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', flexShrink: 0 },
})
