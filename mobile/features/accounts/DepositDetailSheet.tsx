import { forwardRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { depositsApi, formatAmount } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { DepositResponse } from '@xnoll/shared'

function calcExpectedIncome(d: DepositResponse): number {
  const principal = parseFloat(d.amount)
  const rate = parseFloat(d.interest_rate) / 100
  const open = new Date(d.open_date)
  const close = new Date(d.close_date)
  const days = Math.max(0, Math.round((close.getTime() - open.getTime()) / 86400000))
  if (d.interest_type === 'simple') return principal * rate * (days / 365)
  return principal * Math.pow(1 + rate / 365, days) - principal
}

interface Props { deposit: DepositResponse | null; onClose: () => void; onDeleted: () => void; onEdit: () => void }

export const DepositDetailSheet = forwardRef<BottomSheet, Props>(({ deposit, onClose, onDeleted, onEdit }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)
  const qc = useQueryClient()
  const accent = colors.expense

  async function handleDelete() {
    if (!deposit) return
    Alert.alert('Удалить вклад', `Удалить "${deposit.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try {
            await depositsApi.delete(deposit.id)
            qc.invalidateQueries({ queryKey: ['deposits'] })
            showToast('Вклад удалён', '#6366f1')
            onDeleted()
          } catch { showToast('Ошибка удаления', accent) }
        },
      },
    ])
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  if (!deposit) return (
    <BottomSheet ref={ref} index={-1} snapPoints={['75%']} backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }} handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View />
    </BottomSheet>
  )

  const income = calcExpectedIncome(deposit)
  const total = parseFloat(deposit.amount) + income

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['78%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Детали вклада</Text>
          <TouchableOpacity onPress={onEdit}>
            <Text style={[styles.editLink, { color: accent }]}>Изменить</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Row label="Банк" value={deposit.bank_name} colors={colors} />
          <Row label="Сумма" value={`${formatAmount(parseFloat(deposit.amount))} ₽`} colors={colors} />
          <Row label="Баланс" value={`${formatAmount(parseFloat(deposit.balance))} ₽`} colors={colors} />
          <Row label="Ставка" value={`${parseFloat(deposit.interest_rate).toFixed(4)}% (${deposit.interest_type === 'simple' ? 'простые' : 'сложные'})`} colors={colors} />
          <Row label="Открыт" value={deposit.open_date} colors={colors} />
          <Row label="Закрыт" value={deposit.close_date} colors={colors} />
          <Row label="Автопролонгация" value={deposit.auto_renew ? 'Да' : 'Нет'} colors={colors} />
          <Row label="Статус" value={deposit.status} colors={colors} last />
        </View>

        <Text style={[styles.incomeLabel, { color: colors.textMuted }]}>ОЖИДАЕМЫЙ ДОХОД</Text>
        <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Row label="Доход" value={`+${formatAmount(income)} ₽`} valueColor={colors.income} colors={colors} />
          <Row label="Итог" value={`${formatAmount(total)} ₽`} colors={colors} last />
        </View>

        <TouchableOpacity style={[styles.deleteBtn, { borderColor: accent + '66', backgroundColor: accent + '11' }]} onPress={handleDelete}>
          <Text style={[styles.deleteTxt, { color: accent }]}>Удалить вклад</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

function Row({ label, value, valueColor, colors, last = false }: {
  label: string; value: string; valueColor?: string
  colors: ReturnType<typeof useTheme>; last?: boolean
}) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  editLink: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  incomeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  deleteBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  deleteTxt: { fontWeight: '700', fontSize: 15 },
})
