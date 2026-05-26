import { api } from '../client'
import type { CategoryStatsResponse, TimelineResponse, AccountStatsResponse, StatPeriod, CustomRange } from '../types'

type PeriodOrRange = { period: StatPeriod } | CustomRange

function periodParams(p: PeriodOrRange) {
  if ('period' in p) return { period: p.period }
  return { date_from: p.date_from, date_to: p.date_to }
}

export const statsApi = {
  categories: (p: PeriodOrRange) =>
    api.get<CategoryStatsResponse>('/api/v1/stats/categories', { params: periodParams(p) }).then(r => r.data),
  timeline: (p: PeriodOrRange, granularity: 'month' | 'day' = 'month') =>
    api.get<TimelineResponse>('/api/v1/stats/timeline', { params: { ...periodParams(p), granularity } }).then(r => r.data),
  accounts: (p: PeriodOrRange) =>
    api.get<AccountStatsResponse>('/api/v1/stats/accounts', { params: periodParams(p) }).then(r => r.data),
}
