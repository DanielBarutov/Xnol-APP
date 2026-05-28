import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi, depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { DynIcon } from '../../components/DynIcon'
import { CreateAccountSheet } from './CreateAccountSheet'
import { CreateDepositSheet } from './CreateDepositSheet'
import { AccountEditSheet } from './AccountEditSheet'
import { DepositDetailSheet } from './DepositDetailSheet'
import { DepositEditSheet } from './DepositEditSheet'
import { TransferSheet } from './TransferSheet'
import type { AccountResponse, DepositResponse } from '@xnoll/shared'

const TAG_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e',
  '#f97316','#f59e0b','#10b981','#14b8a6','#06b6d4',
  '#3b82f6','#0ea5e9',
]

export function AccountsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()

  const createAccRef = useRef<BottomSheet>(null)
  const createDepRef = useRef<BottomSheet>(null)
  const editAccRef = useRef<BottomSheet>(null)
  const depositDetailRef = useRef<BottomSheet>(null)
  const depositEditRef = useRef<BottomSheet>(null)
  const transferRef = useRef<BottomSheet>(null)

  const [selectedAcc, setSelectedAcc] = useState<AccountResponse | null>(null)
  const [selectedDep, setSelectedDep] = useState<DepositResponse | null>(null)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: depositsApi.list })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['deposits'] })
  }

  function openEditAcc(acc: AccountResponse) {
    setSelectedAcc(acc)
    editAccRef.current?.expand()
  }

  function openDepDetail(dep: DepositResponse) {
    setSelectedDep(dep)
    depositDetailRef.current?.expand()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Счета</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => createAccRef.current?.expand()}>
              <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>+ Счёт</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => createDepRef.current?.expand()}>
              <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>+ Вклад</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.expense + '22', borderColor: colors.expense + '44' }]} onPress={() => transferRef.current?.expand()}>
              <Text style={[styles.headerBtnText, { color: colors.expense }]}>Перевод</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Накопительные счета */}
        {accounts.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>НАКОПИТЕЛЬНЫЕ СЧЕТА</Text>
            {accounts.map((acc, idx) => {
              const dotColor = TAG_COLORS[idx % TAG_COLORS.length]
              const balance = parseFloat(acc.balance)
              const sym = acc.currency === 'RUB' ? '₽' : acc.currency === 'USD' ? '$' : '€'
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.row, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={() => openEditAcc(acc)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: dotColor + '22' }]}>
                    <DynIcon name="CreditCard" size={18} color={dotColor} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.textPrimary }]}>{acc.bank_name ?? acc.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{acc.name}</Text>
                  </View>
                  <Text style={[styles.rowBalance, { color: balance < 0 ? colors.expense : colors.textPrimary }]}>
                    {balance.toLocaleString('ru-RU')} {sym}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Вклады */}
        {deposits.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ВКЛАДЫ</Text>
            {deposits.map(dep => {
              const balance = parseFloat(dep.balance)
              const sym = dep.currency === 'RUB' ? '₽' : dep.currency === 'USD' ? '$' : '€'
              return (
                <TouchableOpacity
                  key={dep.id}
                  style={[styles.row, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={() => openDepDetail(dep)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.accentTint }]}>
                    <DynIcon name="Landmark" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.textPrimary }]}>{dep.bank_name}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                      {parseFloat(dep.interest_rate).toFixed(1)}% · до {dep.close_date}
                    </Text>
                  </View>
                  <Text style={[styles.rowBalance, { color: colors.textPrimary }]}>
                    {balance.toLocaleString('ru-RU')} {sym}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      <CreateAccountSheet ref={createAccRef} onCreated={() => { Keyboard.dismiss(); createAccRef.current?.close() }} onClose={() => { Keyboard.dismiss(); createAccRef.current?.close() }} />
      <CreateDepositSheet ref={createDepRef} onCreated={() => { Keyboard.dismiss(); refresh(); createDepRef.current?.close() }} onClose={() => { Keyboard.dismiss(); createDepRef.current?.close() }} />
      <AccountEditSheet
        ref={editAccRef}
        account={selectedAcc}
        onUpdated={() => { Keyboard.dismiss(); refresh(); editAccRef.current?.close(); setSelectedAcc(null) }}
        onClose={() => { Keyboard.dismiss(); editAccRef.current?.close(); setSelectedAcc(null) }}
      />
      <DepositDetailSheet
        ref={depositDetailRef}
        deposit={selectedDep}
        onClose={() => { Keyboard.dismiss(); depositDetailRef.current?.close(); setSelectedDep(null) }}
        onDeleted={() => { Keyboard.dismiss(); refresh(); depositDetailRef.current?.close(); setSelectedDep(null) }}
        onEdit={() => { depositDetailRef.current?.close(); depositEditRef.current?.expand() }}
      />
      <DepositEditSheet
        ref={depositEditRef}
        deposit={selectedDep}
        onSaved={() => { Keyboard.dismiss(); refresh(); depositEditRef.current?.close() }}
        onCancel={() => { Keyboard.dismiss(); depositEditRef.current?.close() }}
      />
      <TransferSheet ref={transferRef} onCreated={() => { Keyboard.dismiss(); refresh(); transferRef.current?.close() }} onClose={() => { Keyboard.dismiss(); transferRef.current?.close() }} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 6 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  headerBtnText: { fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowBalance: { fontSize: 15, fontWeight: '700', flexShrink: 0 },
})
