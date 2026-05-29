import { api } from '../client'
import type { AccountResponse, CreateAccountRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const accountsApi = {
  list: (params?: { include_deleted?: boolean }) =>
    api.get<AccountResponse[]>('/api/v1/accounts', { params }).then(r => r.data),
  create: (data: CreateAccountRequest, idempotencyKey?: string) =>
    api.post<AccountResponse>('/api/v1/accounts', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
  update: (id: string, data: Partial<CreateAccountRequest>) => api.put<AccountResponse>(`/api/v1/accounts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/accounts/${id}`),
}
