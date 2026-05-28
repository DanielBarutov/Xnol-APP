import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../../../api/endpoints/stats'
import type { StatPeriod, CustomRange } from '../../../api/types'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange) {
  const key = 'period' in p ? p.period : `${p.date_from}/${p.date_to}`
  const categories = useQuery({ queryKey: ['stats', 'categories', key], queryFn: () => statsApi.categories(p) })
  const timeline   = useQuery({ queryKey: ['stats', 'timeline',    key], queryFn: () => statsApi.timeline(p) })
  const accounts   = useQuery({ queryKey: ['stats', 'accounts',    key], queryFn: () => statsApi.accounts(p) })
  return { categories, timeline, accounts }
}
