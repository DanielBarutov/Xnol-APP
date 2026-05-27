import { forwardRef, useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { Sheet } from '../../components/Sheet'
import type { AccountResponse } from '@xnoll/shared'

interface Props { account: AccountResponse; onUpdated: () => void }

export const AccountEditSheet = forwardRef<BottomSheet, Props>(({ account, onUpdated }, ref) => {
  const colors = useTheme()
  const [name, setName] = useState(account.name)
  const [bank, setBank] = useState(account.bank_name)
  const [balance, setBalance] = useState(account.balance)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setName(account.name); setBank(account.bank_name); setBalance(account.balance) }, [account])

  async function handleUpdate() {
    setLoading(true)
    try {
      await accountsApi.update(account.id, { name, bank_name: bank, balance })
      onUpdated()
    } catch {} finally { setLoading(false) }
  }

  function handleDelete() {
    Alert.alert('Удалить счёт', `Удалить "${account.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await accountsApi.delete(account.id)
        onUpdated()
      }},
    ])
  }

  return (
    <Sheet ref={ref} snapPoints={['55%']}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Редактировать счёт</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Банк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Баланс" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
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
