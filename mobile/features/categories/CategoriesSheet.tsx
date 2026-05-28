import { forwardRef, useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { DynIcon } from '../../components/DynIcon'
import type { CategoryResponse } from '@xnoll/shared'

type Tab = 'expense' | 'income'

interface Props {
  onClose: () => void
  onEditCategory: (cat: CategoryResponse) => void
  onCreateCategory: (type: Tab) => void
}

export const CategoriesSheet = forwardRef<BottomSheet, Props>(
  ({ onClose, onEditCategory, onCreateCategory }, ref) => {
    const colors = useTheme()
    const qc = useQueryClient()
    const showToast = useUIStore(s => s.showToast)
    const accent = colors.accent

    const [tab, setTab] = useState<Tab>('expense')

    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
    const list = categories.filter(c => c.type === tab && c.parent_id === null)

    function refresh() { qc.invalidateQueries({ queryKey: ['categories'] }) }

    async function handleDelete(cat: CategoryResponse) {
      Alert.alert('Удалить категорию', `"${cat.name}"?`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive', onPress: async () => {
            try {
              await categoriesApi.delete(cat.id)
              refresh()
              showToast('Категория удалена', colors.income)
            } catch {
              showToast('Нельзя удалить', colors.expense)
            }
          },
        },
      ])
    }

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    )

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={['92%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onClose={onClose}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Категории</Text>
          </View>

          {/* Tabs */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            {(['expense', 'income'] as Tab[]).map(t => {
              const active = tab === t
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, active && { backgroundColor: accent + '22' }]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabText, { color: active ? accent : colors.textMuted }]}>
                    {t === 'expense' ? 'Расходы' : 'Доходы'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {list.map((cat, i) => (
              <View key={cat.id}>
                <View style={styles.catRow}>
                  <View style={[styles.iconWrap, { backgroundColor: (cat.color || accent) + '28' }]}>
                    <DynIcon name={cat.icon || 'Tag'} size={18} color={cat.color || accent} />
                  </View>
                  <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                  {cat.is_system && (
                    <Text style={[styles.sysBadge, { color: colors.textMuted }]}>sys</Text>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onEditCategory(cat)}>
                    <DynIcon name="SquarePen" size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(cat)}>
                    <DynIcon name="Trash2" size={17} color={colors.expense} />
                  </TouchableOpacity>
                </View>
                {i < list.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </BottomSheetScrollView>

          {/* Add button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: accent + '18', borderColor: accent + '44' }]}
              onPress={() => onCreateCategory(tab)}
            >
              <Text style={[styles.addBtnText, { color: accent }]}>+ Добавить категорию</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    )
  },
)

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, borderRadius: 12, borderWidth: 1, padding: 3 },
  tabBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName: { flex: 1, fontSize: 15, fontWeight: '600' },
  sysBadge: { fontSize: 11, fontWeight: '600' },
  iconBtn: { padding: 4 },
  divider: { height: 1 },

  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  addBtn: { height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '700' },
})
