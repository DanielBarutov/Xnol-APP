import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@xnoll/shared'
import type { StatPeriod, CustomRange } from '@xnoll/shared'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange) {
  const categories = useQuery({ queryKey: ['stats', 'categories', p], queryFn: () => statsApi.categories(p) })
  const timeline   = useQuery({ queryKey: ['stats', 'timeline', p],   queryFn: () => statsApi.timeline(p) })
  const accounts   = useQuery({ queryKey: ['stats', 'accounts', p],   queryFn: () => statsApi.accounts(p) })
  return { categories, timeline, accounts }
}
