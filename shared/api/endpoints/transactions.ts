import { api } from '../client'
import type { TransactionResponse, CreateTransactionRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const transactionsApi = {
  list: (params?: { account_id?: string; limit?: number; offset?: number; date_from?: string; date_to?: string }) =>
    api.get<TransactionResponse[]>('/api/v1/transactions', { params }).then(r => r.data),
  get: (id: string) => api.get<TransactionResponse>(`/api/v1/transactions/${id}`).then(r => r.data),
  create: (data: CreateTransactionRequest, idempotencyKey?: string) =>
    api.post<TransactionResponse>('/api/v1/transactions', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/transactions/${id}`),
}
