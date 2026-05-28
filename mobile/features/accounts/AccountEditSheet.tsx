import { forwardRef, useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { Sheet } from '../../components/Sheet'
import type { AccountResponse } from '@xnoll/shared'

const SNAP_POINTS = ['55%'] as const

interface Props { account: AccountResponse | null; onUpdated: () => void }

export const AccountEditSheet = forwardRef<BottomSheet, Props>(({ account, onUpdated }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore((s) => s.showToast)
  const [name, setName] = useState(account?.name ?? '')
  const [bank, setBank] = useState(account?.bank_name ?? '')
  const [balance, setBalance] = useState(account?.balance ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!account) return
    setName(account.name)
    setBank(account.bank_name)
    setBalance(account.balance)
  }, [account])

  if (!account) return null

  async function handleUpdate() {
    if (!account) return
    setLoading(true)
    try {
      await accountsApi.update(account.id, { name, bank_name: bank, balance })
      onUpdated()
    } catch {
      showToast('Ошибка сохранения', colors.expense)
    } finally { setLoading(false) }
  }

  function handleDelete() {
    if (!account) return
    Alert.alert('Удалить счёт', `Удалить "${account.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try {
          await accountsApi.delete(account.id)
          onUpdated()
        } catch {
          showToast('Ошибка удаления', colors.expense)
        }
      }},
    ])
  }

  return (
    <Sheet ref={ref} snapPoints={SNAP_POINTS}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Редактировать счёт</Text>
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Банк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Баланс" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Сохранить</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.expense }]} onPress={handleDelete}>
        <Text style={[styles.deleteText, { color: colors.expense }]}>Удалить счёт</Text>
      </TouchableOpacity>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 15, fontWeight: '600' },
})
