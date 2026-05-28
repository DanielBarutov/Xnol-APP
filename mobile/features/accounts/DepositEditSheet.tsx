import { forwardRef, useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Keyboard } from 'react-native'

import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { LinearGradient } from 'expo-linear-gradient'
import { depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { DepositResponse } from '@xnoll/shared'

function isoToDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

function displayToISO(v: string): string {
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

interface Props { deposit: DepositResponse | null; onSaved: () => void; onCancel: () => void }

export const DepositEditSheet = forwardRef<BottomSheet, Props>(({ deposit, onSaved, onCancel }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)
  const accent = colors.expense

  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [rate, setRate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!deposit) return
    setName(deposit.name)
    setBank(deposit.bank_name)
    setRate(parseFloat(deposit.interest_rate).toFixed(4))
    setCloseDate(isoToDisplay(deposit.close_date))
    setAutoRenew(deposit.auto_renew)
  }, [deposit])

  async function handleSave() {
    if (!deposit) return
    const closeISO = displayToISO(closeDate)
    if (closeDate && !closeISO) { showToast('Неверный формат даты', '#f87171'); return }
    setLoading(true)
    try {
      await depositsApi.update(deposit.id, {
        name, bank_name: bank,
        interest_rate: parseFloat(rate).toFixed(4),
        close_date: closeISO || deposit.close_date,
        auto_renew: autoRenew,
      })
      onSaved()
    } catch { showToast('Ошибка сохранения', accent) }
    finally { setLoading(false) }
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['70%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onCancel}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Редактировать</Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>Название</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Банк</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Банк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Процентная ставка (%)</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="0.0000" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Дата закрытия</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="дд.мм.гггг" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={closeDate} onChangeText={v => setCloseDate(applyDateMask(v))} maxLength={10} />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.textMuted }]}>Автопролонгация</Text>
          <Switch value={autoRenew} onValueChange={setAutoRenew} trackColor={{ true: accent }} thumbColor="#fff" />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={onCancel}>
            <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            <LinearGradient colors={[colors.accent2, accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Сохранить</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  saveGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
