import { forwardRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { Sheet } from '../../components/Sheet'
import type { TransactionType, CategoryResponse } from '@xnoll/shared'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

interface Props { onCreated?: () => void }

export const AddTxSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const flatCats = flatten(categories).filter(c => c.type === type && !c.children?.length)

  async function handleCreate() {
    if (!amount || !accountId || !categoryId) { showToast('Заполните все поля', '#f87171'); return }
    setLoading(true)
    try {
      await transactionsApi.create({ account_id: accountId, category_id: categoryId, type, amount, date, description: description || undefined })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      showToast('Транзакция добавлена', '#34d399')
      setAmount(''); setDescription(''); setCategoryId(null)
      onCreated?.()
    } catch { showToast('Ошибка', '#f87171') }
    finally { setLoading(false) }
  }

  return (
    <Sheet ref={ref} snapPoints={['80%', '95%']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Новая транзакция</Text>

        <View style={[styles.toggle, { backgroundColor: colors.surface2 }]}>
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, type === t && { backgroundColor: t === 'income' ? colors.income : colors.expense }]}
              onPress={() => { setType(t); setCategoryId(null) }}
            >
              <Text style={[styles.toggleText, { color: type === t ? '#fff' : colors.textMuted }]}>
                {t === 'income' ? 'Доход' : 'Расход'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Сумма"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Счёт</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {accounts.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.chip, { borderColor: accountId === a.id ? colors.accent : colors.border, backgroundColor: accountId === a.id ? colors.accentTint : colors.surface2 }]}
              onPress={() => setAccountId(a.id)}
            >
              <Text style={{ color: accountId === a.id ? colors.accent : colors.textSecondary, fontSize: 13 }}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textMuted }]}>Категория</Text>
        <View style={styles.catGrid}>
          {flatCats.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, { borderColor: categoryId === c.id ? colors.accent : colors.border, backgroundColor: categoryId === c.id ? colors.accentTint : colors.surface2 }]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={[styles.catLabel, { color: categoryId === c.id ? colors.accent : colors.textSecondary }]} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Описание (необязательно)"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Дата (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          value={date}
          onChangeText={setDate}
        />

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Добавить</Text>}
        </TouchableOpacity>
      </ScrollView>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 14 },
  toggleBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontWeight: '600', fontSize: 14 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  chips: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 10, borderWidth: 1.5 },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 12, fontWeight: '500', maxWidth: 80 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
