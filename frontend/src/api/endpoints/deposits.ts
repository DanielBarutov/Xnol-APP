import { api } from '../client'
import type { DepositResponse, CreateDepositRequest } from '../types'

export const depositsApi = {
  list: () => api.get<DepositResponse[]>('/api/v1/deposits').then(r => r.data),
  get: (id: string) => api.get<DepositResponse>(`/api/v1/deposits/${id}`).then(r => r.data),
  create: (data: CreateDepositRequest) => api.post<DepositResponse>('/api/v1/deposits', data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/deposits/${id}`),
}
