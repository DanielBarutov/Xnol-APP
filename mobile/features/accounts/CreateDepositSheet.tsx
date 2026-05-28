import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Keyboard } from 'react-native'

import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'RUB', label: '₽ RUB' },
  { key: 'USD', label: '$ USD' },
  { key: 'EUR', label: '€ EUR' },
]

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

function displayToISO(v: string): string {
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

function isoToDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

interface Props { onCreated: () => void; onClose?: () => void }

export const CreateDepositSheet = forwardRef<BottomSheet, Props>(({ onCreated, onClose }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)

  const [bank, setBank] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple')
  const [openDate, setOpenDate] = useState(isoToDisplay(todayISO()))
  const [closeDate, setCloseDate] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)
  const [loading, setLoading] = useState(false)

  const accent = colors.expense

  function reset() {
    setBank(''); setName(''); setCurrency('RUB'); setAmount(''); setRate('')
    setInterestType('simple'); setOpenDate(isoToDisplay(todayISO())); setCloseDate(''); setAutoRenew(false)
  }

  async function handleCreate() {
    if (!bank || !name || !amount || !rate || !openDate || !closeDate) {
      showToast('Заполните все поля', '#f87171'); return
    }
    const openISO = displayToISO(openDate)
    const closeISO = displayToISO(closeDate)
    if (!openISO || !closeISO) { showToast('Неверный формат даты', '#f87171'); return }
    setLoading(true)
    try {
      await depositsApi.create({
        bank_name: bank, name, currency,
        amount: parseFloat(amount.replace(',', '.')).toFixed(2),
        interest_rate: parseFloat(rate.replace(',', '.')).toFixed(4),
        interest_type: interestType,
        open_date: openISO, close_date: closeISO, auto_renew: autoRenew,
      })
      reset(); onCreated()
    } catch { showToast('Ошибка создания вклада', '#f87171') }
    finally { setLoading(false) }
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  const label = (text: string) => (
    <Text style={[styles.label, { color: colors.textMuted }]}>{text}</Text>
  )

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['85%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={() => { reset(); onClose?.() }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Новый вклад</Text>

        {label('БАНК')}
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Сбербанк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />

        {label('НАЗВАНИЕ')}
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Вклад «Сохраняй»" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />

        {label('ВАЛЮТА')}
        <View style={styles.row}>
          {CURRENCIES.map(c => {
            const active = currency === c.key
            return (
              <TouchableOpacity key={c.key} style={[styles.chip, { backgroundColor: active ? accent : colors.surface2, borderColor: active ? accent : colors.border }]} onPress={() => setCurrency(c.key)}>
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            {label('СУММА')}
            <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="100 000" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          </View>
          <View style={styles.colHalf}>
            {label('СТАВКА %')}
            <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="12.5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
          </View>
        </View>

        {label('ТИП ПРОЦЕНТОВ')}
        <View style={styles.row}>
          {(['simple', 'compound'] as const).map(t => {
            const active = interestType === t
            return (
              <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: active ? accent : colors.surface2, borderColor: active ? accent : colors.border }]} onPress={() => setInterestType(t)}>
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{t === 'simple' ? 'Простые' : 'Сложные'}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            {label('ДАТА ОТКРЫТИЯ')}
            <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="дд.мм.гггг" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={openDate} onChangeText={v => setOpenDate(applyDateMask(v))} maxLength={10} />
          </View>
          <View style={styles.colHalf}>
            {label('ДАТА ЗАКРЫТИЯ')}
            <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="дд.мм.гггг" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={closeDate} onChangeText={v => setCloseDate(applyDateMask(v))} maxLength={10} />
          </View>
        </View>

        <View style={[styles.switchRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Автопролонгация</Text>
          <Switch value={autoRenew} onValueChange={setAutoRenew} trackColor={{ true: accent }} thumbColor="#fff" />
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: loading || !bank || !name ? colors.surface2 : accent }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: loading || !bank || !name ? colors.textMuted : '#fff' }]}>Создать вклад</Text>}
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
  row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 10 },
  colHalf: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
})
