import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from 'react-native'

import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { useMutationQueue, genKey } from '../../store/mutationQueue'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'RUB', label: '₽ RUB' },
  { key: 'USD', label: '$ USD' },
  { key: 'EUR', label: '€ EUR' },
]

interface Props { onCreated: () => void; onClose?: () => void }

export const CreateAccountSheet = forwardRef<BottomSheet, Props>(({ onCreated, onClose }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)
  const network = useNetworkStatus()
  const enqueue = useMutationQueue(s => s.add)
  const accent = colors.expense

  const [bank, setBank] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)

  function reset() { setBank(''); setName(''); setCurrency('RUB'); setBalance('0') }

  async function handleCreate() {
    if (!name) { showToast('Введите название', '#f87171'); return }
    const key = genKey()
    const payload = { name, bank_name: bank, currency, balance }

    if (network !== 'online') {
      enqueue({ id: key, type: 'account', payload })
      showToast('Сохранено · отправится при появлении сети', '#f59e0b')
      reset(); onCreated()
      return
    }

    setLoading(true)
    try {
      await accountsApi.create(payload, key)
      reset(); onCreated()
    } catch {
      enqueue({ id: key, type: 'account', payload })
      showToast('Нет связи · сохранено в очередь', '#f59e0b')
      reset(); onCreated()
    } finally { setLoading(false) }
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['65%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={() => { reset(); onClose?.() }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Новый счёт</Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>БАНК</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Сбербанк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />

        <Text style={[styles.label, { color: colors.textMuted }]}>НАЗВАНИЕ</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Основной" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />

        <Text style={[styles.label, { color: colors.textMuted }]}>ВАЛЮТА</Text>
        <View style={styles.currencyRow}>
          {CURRENCIES.map(c => {
            const active = currency === c.key
            return (
              <TouchableOpacity key={c.key} style={[styles.chip, { backgroundColor: active ? accent : colors.surface2, borderColor: active ? accent : colors.border }]} onPress={() => setCurrency(c.key)}>
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>НАЧАЛЬНЫЙ БАЛАНС</Text>
        <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />

        <TouchableOpacity style={[styles.btn, { backgroundColor: name ? accent : colors.surface2 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: name ? '#fff' : colors.textMuted }]}>Создать счёт</Text>}
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
  currencyRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 16, fontWeight: '700' },
})
