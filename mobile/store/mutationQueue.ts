import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { QueryClient } from '@tanstack/react-query'
import type { CreateTransactionRequest, CreateTransferRequest, CreateAccountRequest, CreateDepositRequest, UpdateDepositRequest, CreateCategoryRequest, UpdateCategoryRequest, AccountResponse, DepositResponse } from '@xnoll/shared'

export type QueueItem =
  | { id: string; type: 'transaction'; payload: CreateTransactionRequest; queuedAt: string }
  | { id: string; type: 'transaction_delete'; payload: { id: string }; queuedAt: string }
  | { id: string; type: 'transfer'; payload: CreateTransferRequest; queuedAt: string }
  | { id: string; type: 'account'; payload: CreateAccountRequest; queuedAt: string }
  | { id: string; type: 'account_update'; payload: { id: string } & Partial<CreateAccountRequest>; queuedAt: string }
  | { id: string; type: 'account_delete'; payload: { id: string }; queuedAt: string }
  | { id: string; type: 'deposit'; payload: CreateDepositRequest; queuedAt: string }
  | { id: string; type: 'deposit_update'; payload: { id: string } & UpdateDepositRequest; queuedAt: string }
  | { id: string; type: 'deposit_delete'; payload: { id: string }; queuedAt: string }
  | { id: string; type: 'category_create'; payload: CreateCategoryRequest; queuedAt: string }
  | { id: string; type: 'category_update'; payload: { id: string } & UpdateCategoryRequest; queuedAt: string }
  | { id: string; type: 'category_delete'; payload: { id: string }; queuedAt: string }

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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
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

export function patchDepositBalance(qc: QueryClient, depositId: string, delta: number): void {
  qc.setQueryData<DepositResponse[]>(['deposits'], (deposits = []) =>
    deposits.map(d =>
      d.id === depositId
        ? { ...d, balance: (parseFloat(d.balance) + delta).toFixed(2) }
        : d
    )
  )
}

export function patchDepositAmount(qc: QueryClient, depositId: string, delta: number): void {
  qc.setQueryData<DepositResponse[]>(['deposits'], (deposits = []) =>
    deposits.map(d =>
      d.id === depositId
        ? { ...d, amount: (parseFloat(d.amount) + delta).toFixed(2) }
        : d
    )
  )
}
