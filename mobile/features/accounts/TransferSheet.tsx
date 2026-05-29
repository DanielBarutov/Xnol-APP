import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop, BottomSheetFooter } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance, patchDepositBalance, patchDepositAmount } from '../../store/mutationQueue'
import type { SourceDestType } from '@xnoll/shared'

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'] as const

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type EndpointKind = 'savings_account' | 'deposit'

interface Endpoint { id: string; label: string; kind: EndpointKind }

interface Props { onCreated: () => void; onClose?: () => void }

export const TransferSheet = forwardRef<BottomSheet, Props>(({ onCreated, onClose }, ref) => {
  const colors = useTheme()
  const showToast = useUIStore(s => s.showToast)
  const qc = useQueryClient()
  const enqueue = useMutationQueue((s) => s.add)

  const [step, setStep] = useState(1)
  const [fromKind, setFromKind] = useState<EndpointKind>('savings_account')
  const [toKind, setToKind] = useState<EndpointKind>('savings_account')
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')

  const { data: allAccounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list({ include_deleted: true }) })
  const accounts = allAccounts.filter(a => !a.is_deleted)
  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: depositsApi.list })

  const fromList: Endpoint[] = fromKind === 'savings_account'
    ? accounts.map(a => ({ id: a.id, label: a.bank_name ? `${a.bank_name} · ${a.name}` : a.name, kind: 'savings_account' }))
    : deposits.map(d => ({ id: d.id, label: `${d.bank_name} · ${d.name}`, kind: 'deposit' }))

  const toList: Endpoint[] = toKind === 'savings_account'
    ? accounts.map(a => ({ id: a.id, label: a.bank_name ? `${a.bank_name} · ${a.name}` : a.name, kind: 'savings_account' }))
    : deposits.map(d => ({ id: d.id, label: `${d.bank_name} · ${d.name}`, kind: 'deposit' }))

  function reset() {
    setStep(1); setFromKind('savings_account'); setToKind('savings_account')
    setFromId(null); setToId(null); setAmount('')
  }

  function onKey(k: string) {
    if (k === '←') { setAmount(a => a.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (amount.replace('.', '').length >= 9) return
    setAmount(a => (a === '' || a === '0') && k !== '.' ? k : a + k)
  }

  const canNext = !!fromId && !!toId && fromId !== toId
  const accent = colors.expense

  function handleCreate() {
    if (!fromId || !toId || !amount) { showToast('Заполните все поля', '#f87171'); return }
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed) { showToast('Введите сумму', '#f87171'); return }

    const id = genId()
    const fromLabel = fromList.find(e => e.id === fromId)?.label
    const toLabel = toList.find(e => e.id === toId)?.label
    const payload = {
      source_type: fromKind as SourceDestType,
      source_id: fromId,
      source_label: fromLabel,
      dest_type: toKind as SourceDestType,
      dest_id: toId,
      dest_label: toLabel,
      amount: parsed.toFixed(2),
      currency: 'RUB' as const,
      date: todayISO(),
    }

    enqueue({ id, type: 'transfer', payload })
    if (fromKind === 'savings_account') patchBalance(qc, fromId, -parsed)
    else { patchDepositBalance(qc, fromId, -parsed); patchDepositAmount(qc, fromId, -parsed) }
    if (toKind === 'savings_account') patchBalance(qc, toId, +parsed)
    else { patchDepositBalance(qc, toId, +parsed); patchDepositAmount(qc, toId, +parsed) }
    showToast('Добавлено', '#34d399')
    reset()
    onCreated()
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={28}>
        <View style={{ paddingHorizontal: 20 }}>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: canNext ? accent : colors.surface2 }]}
              onPress={() => setStep(2)} disabled={!canNext}
            >
              <Text style={[styles.footerBtnText, { color: canNext ? '#fff' : colors.textMuted }]}>Далее ›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: amount ? accent : colors.surface2 }]}
              onPress={handleCreate}
            >
              <Text style={[styles.footerBtnText, { color: amount ? '#fff' : colors.textMuted }]}>Перевести</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetFooter>
    ),
    [step, canNext, amount, accent, colors],
  )

  const KindToggle = ({ value, onChange }: { value: EndpointKind; onChange: (k: EndpointKind) => void }) => (
    <View style={[styles.kindToggle, { backgroundColor: colors.surface2 }]}>
      {(['savings_account', 'deposit'] as EndpointKind[]).map(k => {
        const active = value === k
        return (
          <TouchableOpacity key={k} style={[styles.kindBtn, active && { backgroundColor: accent, borderRadius: 10 }]} onPress={() => onChange(k)}>
            <Text style={[styles.kindText, { color: active ? '#fff' : colors.textMuted }]}>{k === 'savings_account' ? 'Счёт' : 'Вклад'}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  return (
    <BottomSheet
      ref={ref} index={-1} snapPoints={['82%']}
      enablePanDownToClose backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={() => { reset(); onClose?.() }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Перевод</Text>
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Шаг {step} из 2</Text>
      </View>

      {step === 1 ? (
        <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ОТКУДА</Text>
          <KindToggle value={fromKind} onChange={k => { setFromKind(k); setFromId(null) }} />
          {fromList.map(e => (
            <TouchableOpacity key={e.id} style={[styles.endpointRow, { backgroundColor: fromId === e.id ? accent + '15' : colors.surface2, borderColor: fromId === e.id ? accent : colors.border }]} onPress={() => setFromId(e.id)}>
              <Text style={[styles.endpointText, { color: fromId === e.id ? accent : colors.textPrimary }]}>{e.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>КУДА</Text>
          <KindToggle value={toKind} onChange={k => { setToKind(k); setToId(null) }} />
          {toList.map(e => (
            <TouchableOpacity key={e.id} style={[styles.endpointRow, { backgroundColor: toId === e.id ? accent + '15' : colors.surface2, borderColor: toId === e.id ? accent : colors.border }]} onPress={() => setToId(e.id)}>
              <Text style={[styles.endpointText, { color: toId === e.id ? accent : colors.textPrimary }]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </BottomSheetScrollView>
      ) : (
        <View style={styles.content}>
          <View style={styles.amountDisplay}>
            <Text style={[styles.amountValue, { color: amount ? accent : colors.textMuted }]}>
              {amount || '0'}
            </Text>
            <Text style={[styles.amountSuffix, { color: colors.textMuted }]}>₽</Text>
          </View>
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
          <View style={{ height: 80 }} />
        </View>
      )}
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  stepLabel: { fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  kindToggle: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 10 },
  kindBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  kindText: { fontSize: 14, fontWeight: '600' },
  endpointRow: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  endpointText: { fontSize: 14, fontWeight: '600' },
  amountDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, paddingVertical: 24 },
  amountValue: { fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  amountSuffix: { fontSize: 22, fontWeight: '700' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  key: { width: '30%', aspectRatio: 1.8, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, fontWeight: '600' },
  footerBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontSize: 16, fontWeight: '700' },
})
