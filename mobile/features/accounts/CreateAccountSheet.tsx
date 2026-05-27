import { forwardRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { Sheet } from '../../components/Sheet'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']
const SNAP_POINTS = ['55%'] as const

interface Props { onCreated: () => void }

export const CreateAccountSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const colors = useTheme()
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [balance, setBalance] = useState('0')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setBank('')
    setBalance('0')
    setCurrency('RUB')
    setError(null)
  }

  async function handleCreate() {
    if (!name) { setError('Введите название'); return }
    setLoading(true)
    setError(null)
    try {
      await accountsApi.create({ name, bank_name: bank, currency, balance })
      reset()
      onCreated()
    } catch { setError('Ошибка создания счёта') }
    finally { setLoading(false) }
  }

  return (
    <Sheet ref={ref} snapPoints={SNAP_POINTS} onClose={reset}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Новый счёт</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Банк (необязательно)" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />
      <BottomSheetTextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Начальный баланс" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
      <View style={styles.row}>
        {CURRENCIES.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, { borderColor: currency === c ? colors.accent : colors.border, backgroundColor: currency === c ? colors.accentTint : colors.surface2 }]} onPress={() => setCurrency(c)}>
            <Text style={{ color: currency === c ? colors.accent : colors.textSecondary, fontWeight: '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Создать</Text>}
      </TouchableOpacity>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#f87171', fontSize: 13, marginBottom: 8 },
})
