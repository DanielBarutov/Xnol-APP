// frontend/src/features/analytics/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../../../api/endpoints/stats'
import type { StatPeriod } from '../../../api/types'

export function useStats(period: StatPeriod) {
  const categories = useQuery({ queryKey: ['stats', 'categories', period], queryFn: () => statsApi.categories(period) })
  const timeline = useQuery({ queryKey: ['stats', 'timeline', period], queryFn: () => statsApi.timeline(period) })
  const accounts = useQuery({ queryKey: ['stats', 'accounts', period], queryFn: () => statsApi.accounts(period) })
  return { categories, timeline, accounts }
}
