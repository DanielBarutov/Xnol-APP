import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CartesianChart, Bar, PolarChart, Pie } from 'victory-native'
import { useStats } from './useStats'
import { formatAmount } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import type { StatPeriod } from '@xnoll/shared'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'day',        label: 'День' },
  { value: 'this_month', label: 'Месяц' },
  { value: 'prev_month', label: 'Прошлый' },
  { value: 'this_year',  label: 'Год' },
]

const PIE_COLORS = ['#6366f1','#ec4899','#34d399','#f59e0b','#06b6d4','#a855f7','#f87171','#10b981']

export function AnalyticsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<StatPeriod>('this_month')

  const { categories, timeline } = useStats({ period })

  const expenseData = (categories.data?.expense_by_category ?? [])
    .map((c, i) => ({
      label: c.category_name,
      value: Math.abs(parseFloat(c.amount)),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .filter(d => d.value > 0)

  const timelineData = (timeline.data?.periods ?? []).map(p => ({
    period: p.period.slice(-5),
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  }))

  const totalIncome  = parseFloat(categories.data?.total_income  ?? '0')
  const totalExpense = Math.abs(parseFloat(categories.data?.total_expense ?? '0'))
  const net = totalIncome - totalExpense

  const isLoading = categories.isLoading || timeline.isLoading

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120 }}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Аналитика</Text>

      {/* Period tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.tab, { backgroundColor: period === p.value ? colors.accent : colors.surface, borderColor: colors.border }]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={{ color: period === p.value ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

      {!isLoading && (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Доходы</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>{formatAmount(totalIncome)} ₽</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Расходы</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatAmount(totalExpense)} ₽</Text>
            </View>
          </View>
          <View style={[styles.netCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Чистый доход</Text>
            <Text style={[styles.summaryValue, { color: net >= 0 ? colors.income : colors.expense }]}>
              {net >= 0 ? '+' : ''}{formatAmount(net)} ₽
            </Text>
          </View>

          {/* Timeline bar chart */}
          {timelineData.length > 1 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Динамика</Text>
              <View style={{ height: 220 }}>
                <CartesianChart
                  data={timelineData}
                  xKey="period"
                  yKeys={['income', 'expense']}
                  axisOptions={{
                    font: null,
                    labelColor: colors.textMuted,
                    lineColor: colors.border,
                  }}
                  padding={{ left: 10, right: 10, top: 10, bottom: 10 }}
                  domainPadding={20}
                >
                  {({ points, chartBounds }) => (
                    <>
                      <Bar
                        points={points.income}
                        chartBounds={chartBounds}
                        color={colors.income}
                        innerPadding={0.3}
                      />
                      <Bar
                        points={points.expense}
                        chartBounds={chartBounds}
                        color={colors.expense}
                        innerPadding={0.3}
                      />
                    </>
                  )}
                </CartesianChart>
              </View>
            </>
          )}

          {/* Expense pie chart */}
          {expenseData.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Расходы по категориям</Text>
              <View style={{ height: 220 }}>
                <PolarChart
                  data={expenseData}
                  labelKey="label"
                  valueKey="value"
                  colorKey="color"
                >
                  <Pie.Chart innerRadius="40%" />
                </PolarChart>
              </View>
              {expenseData.map((d, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                  <Text style={[styles.legendName, { color: colors.textSecondary }]}>{d.label}</Text>
                  <Text style={[styles.legendVal, { color: colors.textPrimary }]}>{formatAmount(d.value)} ₽</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  tabs: { marginBottom: 16 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  netCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4, marginBottom: 20 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14 },
  legendVal: { fontSize: 14, fontWeight: '600' },
})
