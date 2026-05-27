import { useRef, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi, formatCurrency } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { CreateAccountSheet } from './CreateAccountSheet'
import { AccountEditSheet } from './AccountEditSheet'
import type { AccountResponse } from '@xnoll/shared'

export function AccountsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const createRef = useRef<BottomSheet>(null)
  const editRef = useRef<BottomSheet>(null)
  const [selected, setSelected] = useState<AccountResponse | null>(null)

  const { data: accounts = [], isLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  const totalRUB = accounts.filter(a => a.currency === 'RUB').reduce((s, a) => s + parseFloat(a.balance), 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => qc.invalidateQueries({ queryKey: ['accounts'] })} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Счета</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accentTint }]}
            onPress={() => createRef.current?.expand()}
          >
            <Plus size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Итого (RUB)</Text>
          <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{formatCurrency(totalRUB, 'RUB')}</Text>
        </View>

        {accounts.map(account => (
          <TouchableOpacity
            key={account.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setSelected(account); editRef.current?.expand() }}
          >
            <View>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{account.name}</Text>
              {account.bank_name ? <Text style={[styles.cardBank, { color: colors.textMuted }]}>{account.bank_name}</Text> : null}
            </View>
            <Text style={[styles.cardBalance, { color: colors.accent }]}>
              {formatCurrency(parseFloat(account.balance), account.currency)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <CreateAccountSheet ref={createRef} onCreated={() => { qc.invalidateQueries({ queryKey: ['accounts'] }); createRef.current?.close() }} />
      {selected && (
        <AccountEditSheet
          ref={editRef}
          account={selected}
          onUpdated={() => { qc.invalidateQueries({ queryKey: ['accounts'] }); editRef.current?.close() }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 26, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardBank: { fontSize: 12, marginTop: 2 },
  cardBalance: { fontSize: 18, fontWeight: '700' },
})
