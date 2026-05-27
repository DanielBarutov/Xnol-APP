import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, formatAmount, formatDate } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { TransactionResponse } from '@xnoll/shared'

interface Props { transaction: TransactionResponse; onClose: () => void }

export function TransactionDetail({ transaction: tx, onClose }: Props) {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)
  const isIncome = tx.type === 'income'

  async function handleDelete() {
    Alert.alert('Удалить транзакцию', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await transactionsApi.delete(tx.id)
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['accounts'] })
        qc.invalidateQueries({ queryKey: ['stats'] })
        showToast('Транзакция удалена', '#6366f1')
        onClose()
      }},
    ])
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+' : '-'}{formatAmount(parseFloat(tx.amount))} ₽
      </Text>
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Дата</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{formatDate(tx.date)}</Text>
      </View>
      {tx.description && (
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Описание</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{tx.description}</Text>
        </View>
      )}
      <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.expense }]} onPress={handleDelete}>
        <Text style={[styles.deleteTxt, { color: colors.expense }]}>Удалить транзакцию</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  amount: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
  deleteBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  deleteTxt: { fontWeight: '600', fontSize: 15 },
})
