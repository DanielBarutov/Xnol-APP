import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@xnoll/shared'
import type { CustomRange, StatPeriod } from '@xnoll/shared'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange, granularity: 'month' | 'day' = 'month') {
  const key = 'period' in p ? p.period : `${p.date_from}_${p.date_to}`
  const categories = useQuery({ queryKey: ['stats', 'categories', key], queryFn: () => statsApi.categories(p) })
  const timeline   = useQuery({ queryKey: ['stats', 'timeline', key, granularity], queryFn: () => statsApi.timeline(p, granularity) })
  const accounts   = useQuery({ queryKey: ['stats', 'accounts', key], queryFn: () => statsApi.accounts(p) })
  return { categories, timeline, accounts }
}
