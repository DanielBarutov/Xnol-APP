import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop, BottomSheetFooter } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance } from '../../store/mutationQueue'
import type { SourceDestType } from '@xnoll/shared'

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

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
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

  const canNext = !!fromId && !!toId && fromId !== toId
  const accent = colors.expense

  function handleCreate() {
    if (!fromId || !toId || !amount) { showToast('Заполните все поля', '#f87171'); return }
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed) { showToast('Введите сумму', '#f87171'); return }

    const id = genId()
    const payload = {
      source_type: fromKind as SourceDestType,
      source_id: fromId,
      dest_type: toKind as SourceDestType,
      dest_id: toId,
      amount: parsed.toFixed(2),
      currency: 'RUB' as const,
      date: todayISO(),
    }

    enqueue({ id, type: 'transfer', payload })
    patchBalance(qc, fromId, -parsed)
    patchBalance(qc, toId, +parsed)
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
          <TouchableOpacity key={k} style={[styles.kindBtn, active && { backgroundColor: accent, borderRadius: 10 }]} onPress={() => { onChange(k); k === 'savings_account' ? (value === 'deposit' && setFromId(null)) : setFromId(null) }}>
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
        <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>СУММА</Text>
          <BottomSheetTextInput
            style={[styles.amountInput, { backgroundColor: colors.surface2, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <View style={{ height: 80 }} />
        </BottomSheetScrollView>
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
  amountInput: { height: 56, borderRadius: 14, paddingHorizontal: 16, fontSize: 20, fontWeight: '700', borderWidth: 1 },
  footerBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontSize: 16, fontWeight: '700' },
})
