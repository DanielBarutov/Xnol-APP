import { api } from '../client'
import type { AccountResponse, CreateAccountRequest } from '../types'

export const accountsApi = {
  list: () => api.get<AccountResponse[]>('/api/v1/accounts').then(r => r.data),
  create: (data: CreateAccountRequest) => api.post<AccountResponse>('/api/v1/accounts', data).then(r => r.data),
  update: (id: string, data: Partial<CreateAccountRequest>) => api.put<AccountResponse>(`/api/v1/accounts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/accounts/${id}`),
}
