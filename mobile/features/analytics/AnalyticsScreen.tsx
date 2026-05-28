import { useState, useMemo } from 'react'
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PolarChart, Pie } from 'victory-native'
import { useStats } from './useStats'
import { formatAmount } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import type { StatPeriod, CustomRange } from '@xnoll/shared'

type PeriodTab = StatPeriod | 'custom'
type ViewTab = 'overview' | 'categories' | 'accounts'

const PERIOD_TABS: { key: PeriodTab; label: string }[] = [
  { key: 'day',        label: 'День' },
  { key: 'this_month', label: 'Месяц' },
  { key: 'prev_month', label: 'Прошлый' },
  { key: 'this_year',  label: 'Год' },
  { key: 'custom',     label: 'Период' },
]

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'overview',   label: 'Обзор' },
  { key: 'categories', label: 'Категории' },
  { key: 'accounts',   label: 'Счета' },
]

const PIE_COLORS = ['#a855f7','#ec4899','#34d399','#f59e0b','#06b6d4','#6366f1','#f87171','#10b981']

function num(s?: string | null): number {
  const n = parseFloat(s ?? '0')
  return Number.isFinite(n) ? n : 0
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

function displayToISO(v: string): string | undefined {
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

function getParam(period: PeriodTab, from?: string, to?: string): { period: StatPeriod } | CustomRange {
  if (period === 'custom' && from && to) return { date_from: from, date_to: to }
  if (period === 'custom') return { period: 'this_month' }
  return { period }
}

type BarItem = { period: string; income: number; expense: number }

function BarChart({ data, incomeColor, expenseColor, labelColor }: {
  data: BarItem[]
  incomeColor: string
  expenseColor: string
  labelColor: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const chartH = 160
  const barW = Math.min(14, Math.max(6, Math.floor(280 / (data.length * 3))))

  const sel = selected !== null ? data[selected] : null

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Tooltip */}
      <View style={{ height: 48, justifyContent: 'center', marginBottom: 4, paddingHorizontal: 4 }}>
        {sel != null && (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: incomeColor }} />
              <Text style={{ fontSize: 13, color: incomeColor, fontWeight: '700' }}>
                +{formatAmount(sel.income)} ₽
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: expenseColor }} />
              <Text style={{ fontSize: 13, color: expenseColor, fontWeight: '700' }}>
                −{formatAmount(sel.expense)} ₽
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: labelColor, marginLeft: 'auto' }}>{sel.period}</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {data.map((d, i) => {
            const incH = Math.max(2, (d.income / maxVal) * chartH)
            const expH = Math.max(2, (d.expense / maxVal) * chartH)
            const isSelected = selected === i
            return (
              <Pressable
                key={i}
                onPress={() => setSelected(isSelected ? null : i)}
                style={{ alignItems: 'center', gap: 4 }}
              >
                <View style={{ height: chartH, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <View style={{ width: barW, height: incH, backgroundColor: incomeColor, borderRadius: 3, opacity: isSelected ? 1 : 0.75 }} />
                  <View style={{ width: barW, height: expH, backgroundColor: expenseColor, borderRadius: 3, opacity: isSelected ? 1 : 0.75 }} />
                </View>
                <Text style={{ fontSize: 9, color: isSelected ? labelColor : labelColor + '99', textAlign: 'center', width: barW * 2 + 2 }} numberOfLines={1}>
                  {d.period}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: incomeColor }} />
          <Text style={{ fontSize: 11, color: labelColor }}>Доходы</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: expenseColor }} />
          <Text style={{ fontSize: 11, color: labelColor }}>Расходы</Text>
        </View>
      </View>
    </View>
  )
}

export function AnalyticsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const accent = colors.expense

  const [period, setPeriod] = useState<PeriodTab>('this_month')
  const [view, setView] = useState<ViewTab>('overview')
  const [fromDisplay, setFromDisplay] = useState('')
  const [toDisplay, setToDisplay] = useState('')

  const fromISO = displayToISO(fromDisplay)
  const toISO = displayToISO(toDisplay)
  const statsParam = getParam(period, fromISO, toISO)
  const granularity = period === 'this_year' ? 'month' : 'day'

  const { categories, timeline, accounts } = useStats(statsParam, granularity)

  const totalIncome  = num(categories.data?.total_income)
  const totalExpense = Math.abs(num(categories.data?.total_expense))

  const expenseData = useMemo(() =>
    (categories.data?.expense_by_category ?? [])
      .filter(c => num(c.amount) > 0)
      .map((c, i) => ({ label: c.category_name, value: Math.abs(num(c.amount)), color: PIE_COLORS[i % PIE_COLORS.length] })),
    [categories.data],
  )

  const incomeData = useMemo(() =>
    (categories.data?.income_by_category ?? [])
      .filter(c => num(c.amount) > 0)
      .map((c, i) => ({ label: c.category_name, value: num(c.amount), color: PIE_COLORS[i % PIE_COLORS.length] })),
    [categories.data],
  )

  const timelineData = useMemo(() =>
    (timeline.data?.periods ?? []).map(p => ({
      period: p.period.length === 7 ? p.period.slice(-2) : p.period.slice(-5),
      income: num(p.income),
      expense: Math.abs(num(p.expense)),
    })),
    [timeline.data],
  )

  const accountStats = accounts.data?.accounts ?? []

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Аналитика</Text>

      {/* Period tabs */}
      <View style={styles.tabRow}>
        {PERIOD_TABS.map(t => {
          const active = period === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, { backgroundColor: active ? accent : colors.surface2, borderColor: active ? accent : colors.border }]}
              onPress={() => setPeriod(t.key)}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Custom date range */}
      {period === 'custom' && (
        <View style={[styles.dateRow, { marginBottom: 12 }]}>
          <View style={[styles.dateInput, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <TextInput
              style={[styles.dateText, { color: colors.textPrimary }]}
              placeholder="дд.мм.гггг"
              placeholderTextColor={colors.textMuted}
              value={fromDisplay}
              onChangeText={v => setFromDisplay(applyDateMask(v))}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <Text style={[styles.dash, { color: colors.textMuted }]}>—</Text>
          <View style={[styles.dateInput, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <TextInput
              style={[styles.dateText, { color: colors.textPrimary }]}
              placeholder="дд.мм.гггг"
              placeholderTextColor={colors.textMuted}
              value={toDisplay}
              onChangeText={v => setToDisplay(applyDateMask(v))}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>
      )}

      {/* View tabs */}
      <View style={[styles.tabRow, { marginBottom: 20 }]}>
        {VIEW_TABS.map(t => {
          const active = view === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, { flex: 1, backgroundColor: active ? accent : colors.surface2, borderColor: active ? accent : colors.border }]}
              onPress={() => setView(t.key)}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Overview ── */}
      {view === 'overview' && (
        <>
          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: colors.income + '11', borderColor: colors.income + '33' }]}>
              <Text style={[styles.statLabel, { color: colors.income }]}>ДОХОДЫ</Text>
              <Text style={[styles.statValue, { color: colors.income }]}>+{formatAmount(totalIncome)} ₽</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: accent + '11', borderColor: accent + '33' }]}>
              <Text style={[styles.statLabel, { color: accent }]}>РАСХОДЫ</Text>
              <Text style={[styles.statValue, { color: accent }]}>−{formatAmount(totalExpense)} ₽</Text>
            </View>
          </View>

          {timelineData.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Доходы / Расходы</Text>
              <BarChart data={timelineData} incomeColor={colors.income} expenseColor={accent} labelColor={colors.textMuted} />
            </>
          )}

          {timelineData.length === 0 && !categories.isLoading && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Нет данных за период</Text>
          )}
        </>
      )}

      {/* ── Categories ── */}
      {view === 'categories' && (
        <>
          {expenseData.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Расходы по категориям</Text>
              <View style={styles.pieRow}>
                <View style={{ width: 130, height: 130 }}>
                  <PolarChart data={expenseData} labelKey="label" valueKey="value" colorKey="color">
                    <Pie.Chart innerRadius="55%" />
                  </PolarChart>
                </View>
                <View style={styles.legend}>
                  {expenseData.map(d => (
                    <View key={d.label} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.legendName, { color: colors.textSecondary }]} numberOfLines={1}>{d.label}</Text>
                      <Text style={[styles.legendVal, { color: colors.textPrimary }]}>{formatAmount(d.value)} ₽</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {incomeData.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Доходы по категориям</Text>
              <View style={styles.pieRow}>
                <View style={{ width: 130, height: 130 }}>
                  <PolarChart data={incomeData} labelKey="label" valueKey="value" colorKey="color">
                    <Pie.Chart innerRadius="55%" />
                  </PolarChart>
                </View>
                <View style={styles.legend}>
                  {incomeData.map(d => (
                    <View key={d.label} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.legendName, { color: colors.textSecondary }]} numberOfLines={1}>{d.label}</Text>
                      <Text style={[styles.legendVal, { color: colors.textPrimary }]}>{formatAmount(d.value)} ₽</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {expenseData.length === 0 && incomeData.length === 0 && !categories.isLoading && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Нет данных за период</Text>
          )}
        </>
      )}

      {/* ── Accounts ── */}
      {view === 'accounts' && (
        <>
          {accountStats.map(a => {
            const income = num(a.income)
            const expense = Math.abs(num(a.expense))
            const net = num(a.net)
            return (
              <View key={a.account_id} style={[styles.accCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={[styles.accName, { color: colors.textPrimary }]}>{a.account_name}</Text>
                <View style={styles.accStats}>
                  <View style={styles.accCol}>
                    <Text style={[styles.accStatLabel, { color: colors.textMuted }]}>Доходы</Text>
                    <Text style={[styles.accStatVal, { color: colors.income }]}>+{formatAmount(income)} ₽</Text>
                  </View>
                  <View style={styles.accCol}>
                    <Text style={[styles.accStatLabel, { color: colors.textMuted }]}>Расходы</Text>
                    <Text style={[styles.accStatVal, { color: accent }]}>−{formatAmount(expense)} ₽</Text>
                  </View>
                  <View style={styles.accCol}>
                    <Text style={[styles.accStatLabel, { color: colors.textMuted }]}>Итог</Text>
                    <Text style={[styles.accStatVal, { color: net >= 0 ? colors.income : accent }]}>
                      {net >= 0 ? '+' : '−'}{formatAmount(Math.abs(net))} ₽
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}

          {accountStats.length === 0 && !accounts.isLoading && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Нет данных за период</Text>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 14 },

  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 13, height: 34, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  dateText: { fontSize: 13, fontWeight: '500', flex: 1 },
  dash: { fontSize: 16, fontWeight: '600' },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  statValue: { fontSize: 22, fontWeight: '800' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },

  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendName: { flex: 1, fontSize: 13 },
  legendVal: { fontSize: 13, fontWeight: '600' },

  accCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  accName: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  accStats: { flexDirection: 'row' },
  accCol: { flex: 1, gap: 3 },
  accStatLabel: { fontSize: 11, fontWeight: '500' },
  accStatVal: { fontSize: 14, fontWeight: '700' },
})
