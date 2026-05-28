import { forwardRef, useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { DynIcon } from '../../components/DynIcon'
import type { CategoryResponse } from '@xnoll/shared'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#06b6d4', '#f43f5e']

const ICONS = [
  'ShoppingCart','Coffee','Car','Home','Heart','Music','BookOpen',
  'Briefcase','Plane','Gift','UtensilsCrossed','Bus','Zap','Film',
  'Smartphone','Globe','Scissors','Shirt','Pill','GraduationCap','Wallet',
  'TrendingUp','DollarSign','Package','Star','Fuel','ShoppingBag','Pizza',
  'Dumbbell','Gamepad2','Tv','Camera','Headphones','Baby','PawPrint','Flower2',
]

interface Props {
  editing: CategoryResponse | null
  defaultType: 'expense' | 'income'
  categories: CategoryResponse[]
  onSaved: () => void
  onClose: () => void
}

export const CategoryFormSheet = forwardRef<BottomSheet, Props>(
  ({ editing, defaultType, categories, onSaved, onClose }, ref) => {
    const colors = useTheme()
    const showToast = useUIStore(s => s.showToast)
    const accent = colors.accent

    const [name, setName] = useState('')
    const [color, setColor] = useState(COLORS[0])
    const [icon, setIcon] = useState(ICONS[0])
    const [parentId, setParentId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const isEdit = editing !== null
    const title = isEdit ? 'Изменить категорию' : 'Новая категория'

    // Топ-уровневые категории текущего типа (для выбора родителя при создании)
    const parentOptions = categories.filter(
      c => c.type === defaultType && c.parent_id === null && c.id !== editing?.id,
    )

    useEffect(() => {
      if (editing) {
        setName(editing.name)
        setColor(editing.color || COLORS[0])
        setIcon(editing.icon || ICONS[0])
        setParentId(null)
      } else {
        setName('')
        setColor(COLORS[0])
        setIcon(ICONS[0])
        setParentId(null)
      }
    }, [editing])

    async function handleSave() {
      if (!name.trim()) { showToast('Введите название', accent); return }
      setLoading(true)
      try {
        if (isEdit) {
          await categoriesApi.update(editing.id, { name: name.trim(), color, icon })
        } else {
          await categoriesApi.create({
            name: name.trim(),
            type: defaultType,
            color,
            icon,
            ...(parentId ? { parent_id: parentId } : {}),
          })
        }
        onSaved()
      } catch {
        showToast('Ошибка сохранения', colors.expense)
      } finally {
        setLoading(false)
      }
    }

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
      [],
    )

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={['88%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onClose={onClose}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <DynIcon name="ChevronLeft" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>

          {/* Родительская категория (только для создания) */}
          {!isEdit && (
            <>
              <Text style={[styles.label, { color: colors.textMuted }]}>РОДИТЕЛЬСКАЯ КАТЕГОРИЯ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.parentChip, {
                      backgroundColor: parentId === null ? accent + '22' : colors.surface2,
                      borderColor: parentId === null ? accent : colors.border,
                    }]}
                    onPress={() => setParentId(null)}
                  >
                    <Text style={[styles.parentChipText, { color: parentId === null ? accent : colors.textSecondary }]}>
                      Без родительской
                    </Text>
                  </TouchableOpacity>
                  {parentOptions.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.parentChip, {
                        backgroundColor: parentId === p.id ? accent + '22' : colors.surface2,
                        borderColor: parentId === p.id ? accent : colors.border,
                      }]}
                      onPress={() => setParentId(p.id)}
                    >
                      <Text style={[styles.parentChipText, { color: parentId === p.id ? accent : colors.textSecondary }]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Название */}
          <Text style={[styles.label, { color: colors.textMuted }]}>НАЗВАНИЕ</Text>
          <BottomSheetTextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Название"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          {/* Цвет */}
          <Text style={[styles.label, { color: colors.textMuted }]}>ЦВЕТ</Text>
          <View style={[styles.colorRow, { marginBottom: 18 }]}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' }]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Иконка */}
          <Text style={[styles.label, { color: colors.textMuted }]}>ИКОНКА</Text>
          <View style={styles.iconGrid}>
            {ICONS.map(ic => {
              const active = icon === ic
              return (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconCell, {
                    backgroundColor: active ? color + '30' : colors.surface2,
                    borderColor: active ? color : colors.border,
                  }]}
                  onPress={() => setIcon(ic)}
                >
                  <DynIcon name={ic} size={20} color={active ? color : colors.textSecondary} />
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <View style={[styles.previewIcon, { backgroundColor: color + '28' }]}>
              <DynIcon name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.previewName, { color: name ? colors.textPrimary : colors.textMuted }]}>
              {name || 'Название категории'}
            </Text>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveTxt}>Сохранить</Text>
            }
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    )
  },
)

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, marginTop: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800' },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, marginBottom: 18 },

  parentChip: { height: 36, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  parentChipText: { fontSize: 13, fontWeight: '600' },

  colorRow: { flexDirection: 'row', gap: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconCell: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  previewIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 16, fontWeight: '600' },

  saveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
