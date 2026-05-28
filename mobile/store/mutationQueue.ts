import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { QueryClient } from '@tanstack/react-query'
import type { CreateTransactionRequest, CreateTransferRequest, CreateAccountRequest, AccountResponse } from '@xnoll/shared'

export type QueueItem =
  | { id: string; type: 'transaction'; payload: CreateTransactionRequest; queuedAt: string }
  | { id: string; type: 'transfer'; payload: CreateTransferRequest; queuedAt: string }
  | { id: string; type: 'account'; payload: CreateAccountRequest; queuedAt: string }

interface MutationQueueState {
  items: QueueItem[]
  add: (item: Omit<QueueItem, 'queuedAt'>) => void
  remove: (id: string) => void
}

export const useMutationQueue = create<MutationQueueState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set(s => ({
          items: [
            ...s.items,
            { ...item, queuedAt: new Date().toISOString() } as QueueItem,
          ],
        })),
      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    {
      name: 'xnoll-mutation-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

export function genId(): string {
  return crypto.randomUUID()
}

export function patchBalance(qc: QueryClient, accountId: string, delta: number): void {
  qc.setQueryData<AccountResponse[]>(['accounts'], (accounts = []) =>
    accounts.map(a =>
      a.id === accountId
        ? { ...a, balance: (parseFloat(a.balance) + delta).toFixed(2) }
        : a
    )
  )
}
