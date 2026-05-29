import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, depositsApi, formatAmount, formatDate } from '@xnoll/shared'
import type { TransferResponse } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, patchBalance, patchDepositBalance, patchDepositAmount } from '../../store/mutationQueue'

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

interface Props { transfer: TransferResponse; onClose: () => void }

export function TransferDetail({ transfer: tr, onClose }: Props) {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore(s => s.showToast)
  const queueItems = useMutationQueue(s => s.items)
  const removeFromQueue = useMutationQueue(s => s.remove)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const isPending = queueItems.some(i => i.id === tr.id && i.type === 'transfer')
  const pendingItem = isPending
    ? queueItems.find(i => i.id === tr.id && i.type === 'transfer')
    : undefined

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list({ include_deleted: true }) })
  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: depositsApi.list })

  const accountNameById = Object.fromEntries(accounts.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))
  const depositNameById = Object.fromEntries(deposits.map(d => [d.id, `${d.bank_name} · ${d.name}`]))
  const entityNameById = { ...accountNameById, ...depositNameById }

  function resolveName(id: string | null, label: string | null, type: string): string {
    if (id && entityNameById[id]) return entityNameById[id]
    if (label) return label
    return type === 'external' ? 'Внешний' : 'Счёт'
  }

  const srcName = resolveName(tr.source_id, tr.source_label, tr.source_type)
  const dstName = resolveName(tr.dest_id, tr.dest_label, tr.dest_type)

  function handleDelete() {
    setConfirmVisible(true)
  }

  function confirmDelete() {
    setConfirmVisible(false)
    if (isPending && pendingItem && pendingItem.type === 'transfer') {
      // Reverse optimistic balance patches and remove from queue
      const p = pendingItem.payload
      const amount = parseFloat(p.amount)
      if (p.source_type === 'savings_account' && p.source_id) patchBalance(qc, p.source_id, +amount)
      else if (p.source_type === 'deposit' && p.source_id) { patchDepositBalance(qc, p.source_id, +amount); patchDepositAmount(qc, p.source_id, +amount) }
      if (p.dest_type === 'savings_account' && p.dest_id) patchBalance(qc, p.dest_id, -amount)
      else if (p.dest_type === 'deposit' && p.dest_id) { patchDepositBalance(qc, p.dest_id, -amount); patchDepositAmount(qc, p.dest_id, -amount) }
      removeFromQueue(tr.id)
      showToast('Перевод отменён', '#6366f1')
    }
    onClose()
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Детали перевода</Text>
        {isPending && (
          <View style={[styles.badge, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>В очереди</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Row label="Откуда" value={srcName} colors={colors} />
        <Row label="Куда" value={dstName} colors={colors} />
        <Row
          label="Сумма"
          value={`${formatAmount(parseFloat(tr.amount))} ₽`}
          valueColor={colors.accent}
          colors={colors}
        />
        <Row label="Дата" value={formatTxDate(tr.date)} colors={colors} last />
      </View>

      {isPending && (
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.expense + '66', backgroundColor: colors.expense + '11' }]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteTxt, { color: colors.expense }]}>Отменить перевод</Text>
        </TouchableOpacity>
      )}

      <ConfirmModal
        visible={confirmVisible}
        title="Отменить перевод"
        message={`${srcName} → ${dstName}, ${formatAmount(parseFloat(tr.amount))} ₽`}
        confirmLabel="Отменить"
        cancelLabel="Закрыть"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  )
}

function Row({ label, value, valueColor, colors, last = false }: {
  label: string; value: string; valueColor?: string
  colors: ReturnType<typeof useTheme>; last?: boolean
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 13 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  deleteBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  deleteTxt: { fontWeight: '700', fontSize: 15 },
})
