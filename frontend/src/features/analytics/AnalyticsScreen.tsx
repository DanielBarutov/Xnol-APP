// frontend/src/features/analytics/AnalyticsScreen.tsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { useStats } from './hooks/useStats'
import { formatAmount } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'
import type { StatPeriod } from '../../api/types'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'this_month', label: 'Месяц' },
  { value: 'prev_month', label: 'Прошлый' },
  { value: 'this_year', label: 'Год' },
]

const PIE_COLORS = ['#6366f1','#ec4899','#34d399','#f59e0b','#06b6d4','#a855f7','#f87171','#10b981']

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<StatPeriod>('this_month')
  const { categories, timeline } = useStats(period)

  const expenseData = categories.data?.expense_by_category.map(c => ({
    name: c.category_name, value: Math.abs(parseFloat(c.amount)),
  })) ?? []

  const timelineData = timeline.data?.periods.map(p => ({
    name: p.period,
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  })) ?? []

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 20 }}>Аналитика</div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} style={{
            flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 600,
            background: period === p.value ? 'var(--accent-tint)' : COLORS.surface2,
            border: `1.5px solid ${period === p.value ? 'var(--accent)' : COLORS.border}`,
            color: period === p.value ? 'var(--accent)' : COLORS.textSecondary,
            cursor: 'pointer',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Summary */}
      {categories.data && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.income}12`, border: `1px solid ${COLORS.income}33` }}>
            <div style={{ fontSize: 11, color: COLORS.income, fontWeight: 600, marginBottom: 4 }}>ДОХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.income }}>+{formatAmount(parseFloat(categories.data.total_income))} ₽</div>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.expense}12`, border: `1px solid ${COLORS.expense}33` }}>
            <div style={{ fontSize: 11, color: COLORS.expense, fontWeight: 600, marginBottom: 4 }}>РАСХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.expense }}>−{formatAmount(Math.abs(parseFloat(categories.data.total_expense)))} ₽</div>
          </div>
        </div>
      )}

      {/* Timeline bar chart */}
      {timelineData.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Доходы / Расходы</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timelineData} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v) => typeof v === 'number' ? `${formatAmount(v)} ₽` : String(v)}
              />
              <Bar dataKey="income" fill={COLORS.income} radius={[6,6,0,0]} maxBarSize={24} name="Доход" />
              <Bar dataKey="expense" fill={COLORS.expense} radius={[6,6,0,0]} maxBarSize={24} name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie chart */}
      {expenseData.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Расходы по категориям</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <PieChart width={140} height={140}>
              <Pie data={expenseData} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {expenseData.map((entry, i) => <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenseData.slice(0, 5).map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: COLORS.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>{formatAmount(item.value)} ₽</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(categories.isLoading || timeline.isLoading) && <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка статистики...</div>}
      {(categories.isError || timeline.isError) && <div style={{ color: COLORS.expense, fontSize: 13 }}>Ошибка загрузки</div>}
    </div>
  )
}
