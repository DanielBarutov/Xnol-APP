import { forwardRef, useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import BottomSheet, { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop, BottomSheetFooter } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance } from '../../store/mutationQueue'
import { DynIcon } from '../../components/DynIcon'
import type { TransactionType, CategoryResponse } from '@xnoll/shared'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

function getLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'] as const

interface Props {
  onCreated?: () => void
  onClose?: () => void
}

export const AddTxSheet = forwardRef<BottomSheet, Props>(({ onCreated, onClose }, ref) => {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)
  const modal = useUIStore((s) => s.modal)
  const enqueue = useMutationQueue((s) => s.add)

  const sheetRef = useRef<BottomSheet>(null)
  useImperativeHandle(ref, () => sheetRef.current as BottomSheet)

  const [step, setStep] = useState(1)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id)
  }, [accounts.length])

  // When modal opens with a kind, reset and set type
  useEffect(() => {
    if (modal.type === 'add-tx') {
      const kind = (modal.payload as { kind?: string })?.kind === 'income' ? 'income' : 'expense'
      reset(kind)
    }
  }, [modal.type, modal.payload])

  const flatCats = flatten(categories).filter(c => c.type === type && !c.children?.length)
  const accent = type === 'income' ? colors.income : colors.expense

  function reset(kind: TransactionType = 'expense') {
    setStep(1)
    setType(kind)
    setAmount('')
    setCategoryId(null)
    setComment('')
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  function onKey(k: string) {
    if (k === '←') { setAmount(a => a.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (amount.replace('.', '').length >= 9) return
    setAmount(a => (a === '' || a === '0') && k !== '.' ? k : a + k)
  }

  function handleNext() {
    if (step === 1) {
      if (!parseFloat(amount || '0')) { showToast('Введите сумму', '#f87171'); return }
      setStep(2)
    } else if (step === 2) {
      if (!categoryId) { showToast('Выберите категорию', '#f87171'); return }
      setStep(3)
    }
  }

  function handleCreate() {
    if (!accountId) { showToast('Выберите счёт', '#f87171'); return }
    const parsed = parseFloat(amount)
    if (!parsed) { showToast('Введите сумму', '#f87171'); return }

    const id = genId()
    const payload = {
      account_id: accountId,
      category_id: categoryId!,
      type,
      amount: parsed.toFixed(2),
      date: getLocalDate(),
      description: comment || undefined,
    }

    enqueue({ id, type: 'transaction', payload })
    patchBalance(qc, accountId, type === 'income' ? parsed : -parsed)
    showToast('Добавлено', '#34d399')
    reset()
    onCreated?.()
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  )

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => {
      if (step === 1) return null
      const isStep2 = step === 2
      const enabled = isStep2 ? !!categoryId : !!accountId
      const label = isStep2 ? 'Далее' : 'Добавить'
      const icon = isStep2 ? 'ChevronRight' : 'Check'
      return (
        <BottomSheetFooter {...props} bottomInset={28}>
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: enabled ? accent : colors.surface2 }]}
              onPress={isStep2 ? handleNext : handleCreate}
            >
              <Text style={[styles.nextBtnText, { color: enabled ? '#fff' : colors.textMuted }]}>{label}</Text>
              <DynIcon name={icon} size={18} color={enabled ? '#fff' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </BottomSheetFooter>
      )
    },
    [step, categoryId, accountId, accent, colors, handleNext, handleCreate],
  )

  const stepLabels = ['Сумма', 'Категория', 'Счёт']
  const typeLabel = type === 'income' ? 'Доход' : 'Расход'

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      maxDynamicContentSize={SCREEN_H * 0.88}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={handleClose}
    >
      <BottomSheetView>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(s => s - 1) : handleClose()}
          style={styles.headerBtn}
        >
          <DynIcon name={step > 1 ? 'ChevronLeft' : 'X'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            ШАГ {step} ИЗ 3 · {typeLabel.toUpperCase()}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{stepLabels[step - 1]}</Text>
        </View>

        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <DynIcon name="X" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map(n => (
          <View
            key={n}
            style={[styles.progressBar, { backgroundColor: n <= step ? accent : colors.border }]}
          />
        ))}
      </View>

      {/* ─── Step 1: Amount ─── */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          {/* Income/Expense toggle */}
          <View style={[styles.toggle, { backgroundColor: colors.surface2 }]}>
            {(['income', 'expense'] as TransactionType[]).map(t => {
              const active = type === t
              const c = t === 'income' ? colors.income : colors.expense
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.toggleBtn, active && { backgroundColor: c + '22', borderColor: c, borderWidth: 1.5 }]}
                  onPress={() => { setType(t); setCategoryId(null) }}
                >
                  <Text style={[styles.toggleText, { color: active ? c : colors.textMuted }]}>
                    {t === 'income' ? '+ Доход' : '− Расход'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Amount display */}
          <View style={styles.amountDisplay}>
            <Text style={[styles.amountPrefix, { color: amount ? accent : colors.textMuted }]}>
              {type === 'income' ? '+' : '−'}
            </Text>
            <Text style={[styles.amountValue, { color: amount ? accent : colors.textMuted }]}>
              {amount || '0'}
            </Text>
            <Text style={[styles.amountSuffix, { color: colors.textMuted }]}>₽</Text>
          </View>

          {/* Numpad */}
          <View style={styles.numpad}>
            {KEYPAD.map(k => (
              <TouchableOpacity
                key={k}
                style={[styles.key, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => onKey(k)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, { color: k === '←' ? colors.textSecondary : colors.textPrimary }]}>
                  {k}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next button */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: parseFloat(amount || '0') ? accent : colors.surface2 }]}
            onPress={handleNext}
          >
            <Text style={[styles.nextBtnText, { color: parseFloat(amount || '0') ? '#fff' : colors.textMuted }]}>
              Далее
            </Text>
            <DynIcon name="ChevronRight" size={18} color={parseFloat(amount || '0') ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Step 2: Category ─── */}
      {step === 2 && (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: SCREEN_H * 0.7 }}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.catGrid}>
            {flatCats.map(c => {
              const sel = categoryId === c.id
              const catColor = c.color ?? accent
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catCard,
                    { backgroundColor: sel ? catColor + '22' : colors.surface2, borderColor: sel ? catColor + '99' : colors.border },
                  ]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: catColor + '22' }]}>
                    <DynIcon name={c.icon ?? 'Package'} size={22} color={sel ? catColor : colors.textSecondary} />
                  </View>
                  <Text style={[styles.catLabel, { color: sel ? catColor : colors.textSecondary }]} numberOfLines={2}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </BottomSheetScrollView>
      )}

      {/* ─── Step 3: Account + Comment ─── */}
      {step === 3 && (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: SCREEN_H * 0.7 }}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {type === 'income' ? 'ЗАЧИСЛИТЬ НА СЧЁТ' : 'СПИСАТЬ СО СЧЁТА'}
          </Text>
          <View style={styles.accountList}>
            {accounts.map(a => {
              const sel = accountId === a.id
              const balance = parseFloat(a.balance).toLocaleString('ru-RU')
              const sym = a.currency === 'RUB' ? '₽' : a.currency === 'USD' ? '$' : '€'
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.accountRow,
                    { backgroundColor: sel ? colors.accentTint : colors.surface2, borderColor: sel ? colors.accent : colors.border },
                  ]}
                  onPress={() => setAccountId(a.id)}
                >
                  <DynIcon name="CreditCard" size={16} color={sel ? colors.accent : colors.textMuted} />
                  <Text style={[styles.accountName, { color: sel ? colors.accent : colors.textPrimary }]} numberOfLines={1}>
                    {a.bank_name ? `${a.bank_name} · ${a.name}` : a.name}
                  </Text>
                  <Text style={[styles.accountBalance, { color: colors.textMuted }]}>{balance} {sym}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>КОММЕНТАРИЙ</Text>
          <BottomSheetTextInput
            style={[styles.commentInput, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Необязательно"
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
          />

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: accent + '12', borderColor: accent + '33' }]}>
            <Text style={[styles.summaryAmount, { color: accent }]}>
              {type === 'income' ? '+' : '−'}{parseFloat(amount).toLocaleString('ru-RU')} ₽
            </Text>
          </View>
        </BottomSheetScrollView>
      )}
      </BottomSheetView>
    </BottomSheet>
  )
})

const KEY_W = (SCREEN_W - 40 - 16) / 3  // 3 columns, 20px side padding, 8px gaps

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 8, borderBottomWidth: 0,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSub: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', marginTop: 2 },

  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  progressBar: { flex: 1, height: 3, borderRadius: 2 },

  stepContainer: { paddingHorizontal: 20, paddingBottom: 32 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
  footerContainer: { paddingHorizontal: 20 },

  toggle: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 8, gap: 4 },
  toggleBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontWeight: '700', fontSize: 14 },

  amountDisplay: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingVertical: 12, gap: 2,
  },
  amountPrefix: { fontSize: 30, fontWeight: '700', lineHeight: 52, opacity: 0.7 },
  amountValue: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 58 },
  amountSuffix: { fontSize: 24, fontWeight: '600', lineHeight: 40, marginLeft: 4 },

  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  key: {
    width: KEY_W, height: 56, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 22, fontWeight: '600' },

  nextBtn: {
    height: 52, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catCard: {
    width: '25%', flexGrow: 1, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 8,
  },
  catIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  accountList: { gap: 8 },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
  },
  accountName: { flex: 1, fontSize: 14, fontWeight: '600' },
  accountBalance: { fontSize: 13 },

  commentInput: {
    height: 48, borderRadius: 12, paddingHorizontal: 14,
    fontSize: 15, borderWidth: 1, marginBottom: 12,
  },

  summary: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    alignItems: 'center', marginBottom: 4,
  },
  summaryAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
})
