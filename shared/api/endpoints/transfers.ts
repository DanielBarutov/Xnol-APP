import { api } from '../client'
import type { TransferResponse, CreateTransferRequest } from '../types'

export const transfersApi = {
  list: () => api.get<TransferResponse[]>('/api/v1/transfers').then(r => r.data),
  create: (data: CreateTransferRequest) => api.post<TransferResponse>('/api/v1/transfers', data).then(r => r.data),
}
