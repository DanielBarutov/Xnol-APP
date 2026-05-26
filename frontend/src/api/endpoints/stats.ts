import { api } from '../client'
import type { CategoryStatsResponse, TimelineResponse, AccountStatsResponse, StatPeriod } from '../types'

export const statsApi = {
  categories: (period: StatPeriod) =>
    api.get<CategoryStatsResponse>('/api/v1/stats/categories', { params: { period } }).then(r => r.data),
  timeline: (period: StatPeriod, granularity: 'month' | 'day' = 'month') =>
    api.get<TimelineResponse>('/api/v1/stats/timeline', { params: { period, granularity } }).then(r => r.data),
  accounts: (period: StatPeriod) =>
    api.get<AccountStatsResponse>('/api/v1/stats/accounts', { params: { period } }).then(r => r.data),
}
