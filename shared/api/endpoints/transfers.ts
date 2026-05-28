import { api } from '../client'
import type { TransferResponse, CreateTransferRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const transfersApi = {
  list: () => api.get<TransferResponse[]>('/api/v1/transfers').then(r => r.data),
  create: (data: CreateTransferRequest, idempotencyKey?: string) =>
    api.post<TransferResponse>('/api/v1/transfers', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
}
