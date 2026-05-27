import { api } from '../client'
import type { TransactionResponse, CreateTransactionRequest } from '../types'

export const transactionsApi = {
  list: (params?: { account_id?: string; limit?: number; offset?: number; date_from?: string; date_to?: string }) =>
    api.get<TransactionResponse[]>('/api/v1/transactions', { params }).then(r => r.data),
  get: (id: string) => api.get<TransactionResponse>(`/api/v1/transactions/${id}`).then(r => r.data),
  create: (data: CreateTransactionRequest) =>
    api.post<TransactionResponse>('/api/v1/transactions', data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/transactions/${id}`),
}
