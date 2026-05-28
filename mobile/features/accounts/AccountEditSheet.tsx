import { forwardRef, useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard } from 'react-native'

import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { LinearGradient } from 'expo-linear-gradient'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { AccountResponse } from '@xnoll/shared'

interface Props { account: AccountResponse | null; onUpdated: () => void; onClose?: () => void }

export const AccountEditSheet = forwardRef<BottomSheet, Props>(({ account, onUpdated, onClose }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)
  const accent = colors.expense

  const [bank, setBank] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!account) return
    setBank(account.bank_name ?? '')
    setName(account.name)
    setBalance(account.balance)
  }, [account])

  async function handleUpdate() {
    if (!account) return
    setLoading(true)
    try {
      await accountsApi.update(account.id, { name, bank_name: bank, balance })
      onUpdated()
    } catch { showToast('Ошибка сохранения', accent) }
    finally { setLoading(false) }
  }

  function handleDelete() {
    if (!account) return
    Alert.alert('Удалить счёт', `Удалить "${account.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try {
            await accountsApi.delete(account.id)
            onUpdated()
          } catch { showToast('Ошибка удаления', accent) }
        },
      },
    ])
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['60%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Редактировать счёт</Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>БАНК</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Банк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />

        <Text style={[styles.label, { color: colors.textMuted }]}>НАЗВАНИЕ</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />

        <Text style={[styles.label, { color: colors.textMuted }]}>НАЧАЛЬНЫЙ ОСТАТОК</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
          <LinearGradient colors={[colors.accent2, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Сохранить</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.deleteBtn, { borderColor: accent + '66', backgroundColor: accent + '11' }]} onPress={handleDelete}>
          <Text style={[styles.deleteTxt, { color: accent }]}>Удалить счёт</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, marginBottom: 14 },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  saveGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  deleteTxt: { fontSize: 15, fontWeight: '700' },
})
