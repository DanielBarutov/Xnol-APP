import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, transfersApi, accountsApi, depositsApi, categoriesApi } from '@xnoll/shared'
import type { DepositResponse } from '@xnoll/shared'
import { useMutationQueue } from '../store/mutationQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { useUIStore } from '../store/ui'

// Allows external callers (e.g. ProfileScreen) to trigger an immediate sync
export const syncTrigger = { run: () => {} }

export function useMutationSync() {
  const qc = useQueryClient()
  const network = useNetworkStatus()
  const processing = useRef(false)

  const processQueue = useCallback(async () => {
    if (processing.current) return
    const initialIds = useMutationQueue.getState().items.map(i => i.id)
    if (initialIds.length === 0) return

    processing.current = true
    let processed = 0   // total items removed from queue (synced + discarded)
    let synced = 0      // items successfully sent to the server

    try {
      for (const itemId of initialIds) {
        // Use live item so any ID remapping from prior iterations is reflected
        const { items: liveItems, remove } = useMutationQueue.getState()
        const item = liveItems.find(i => i.id === itemId)
        if (!item) continue

        try {
          if (item.type === 'transaction') {
            await transactionsApi.create(item.payload, item.id)
          } else if (item.type === 'transaction_delete') {
            await transactionsApi.delete(item.payload.id)
          } else if (item.type === 'transfer') {
            await transfersApi.create(item.payload, item.id)
          } else if (item.type === 'account') {
            const serverAcc = await accountsApi.create(item.payload, item.id)
            if (serverAcc.id !== item.id) {
              useMutationQueue.setState(s => ({
                items: s.items.map(q => {
                  if (q.type === 'transaction' && q.payload.account_id === item.id)
                    return { ...q, payload: { ...q.payload, account_id: serverAcc.id } }
                  if (q.type === 'transfer' && q.payload.source_id === item.id)
                    return { ...q, payload: { ...q.payload, source_id: serverAcc.id } }
                  if (q.type === 'transfer' && q.payload.dest_id === item.id)
                    return { ...q, payload: { ...q.payload, dest_id: serverAcc.id } }
                  return q
                }),
              }))
            }
          } else if (item.type === 'account_update') {
            const { id, ...data } = item.payload
            await accountsApi.update(id, data)
          } else if (item.type === 'account_delete') {
            await accountsApi.delete(item.payload.id)
          } else if (item.type === 'deposit') {
            const serverDep = await depositsApi.create(item.payload)
            if (serverDep.id !== item.id) {
              // Remap the local UUID to the server-assigned UUID in all pending items
              qc.setQueryData<DepositResponse[]>(['deposits'], (deps = []) =>
                deps.map(d => d.id === item.id ? { ...d, id: serverDep.id } : d)
              )
              useMutationQueue.setState(s => ({
                items: s.items.map(q => {
                  if (q.type === 'deposit_update' && q.payload.id === item.id)
                    return { ...q, payload: { ...q.payload, id: serverDep.id } }
                  if (q.type === 'deposit_delete' && q.payload.id === item.id)
                    return { ...q, payload: { ...q.payload, id: serverDep.id } }
                  return q
                }),
              }))
            }
          } else if (item.type === 'deposit_update') {
            const { id, ...data } = item.payload
            await depositsApi.update(id, data)
          } else if (item.type === 'deposit_delete') {
            await depositsApi.delete(item.payload.id)
          } else if (item.type === 'category_create') {
            const serverCat = await categoriesApi.create(item.payload)
            if (serverCat.id !== item.id) {
              useMutationQueue.setState(s => ({
                items: s.items.map(q => {
                  if (q.type === 'transaction' && q.payload.category_id === item.id)
                    return { ...q, payload: { ...q.payload, category_id: serverCat.id } }
                  return q
                }),
              }))
            }
          } else if (item.type === 'category_update') {
            const { id, ...data } = item.payload
            await categoriesApi.update(id, data)
          } else if (item.type === 'category_delete') {
            await categoriesApi.delete(item.payload.id)
          }
          remove(item.id)
          processed++
          synced++
        } catch (err) {
          const status = (err as any)?.response?.status
          console.warn('[Sync] failed item', JSON.stringify({ id: item.id, type: item.type, status }), String(err))
          // 404 = already deleted/never existed; 409 = already created (idempotency);
          // 422 = permanent validation failure — all three are unrecoverable, drop and continue.
          if (status === 404 || status === 409 || status === 422) {
            remove(item.id)
            processed++
            continue
          }
          // Transient failure (5xx, network) — stop and retry next cycle
          break
        }
      }
    } finally {
      processing.current = false
    }

    if (processed > 0) {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })

      // Only pull fresh server state for entities with optimistic patches once
      // the queue is empty — otherwise the refetch overwrites patches for items
      // still waiting to sync.
      if (useMutationQueue.getState().items.length === 0) {
        qc.invalidateQueries({ queryKey: ['accounts'] })
        qc.invalidateQueries({ queryKey: ['deposits'] })
        qc.invalidateQueries({ queryKey: ['categories'] })
      }

      if (synced > 0) useUIStore.getState().showToast(`Отправлено ${synced} операций`, '#34d399')
    }
  }, [qc])

  // Expose so external callers can trigger an immediate sync
  useEffect(() => {
    syncTrigger.run = processQueue
  }, [processQueue])

  // Trigger on network come-back
  useEffect(() => {
    if (network === 'online') processQueue()
  }, [network, processQueue])

  // App foregrounding
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && network === 'online') processQueue()
    })
    return () => sub.remove()
  }, [network, processQueue])

  // Auto-retry every 30s while queue has items and network is online
  useEffect(() => {
    if (network !== 'online') return
    const interval = setInterval(() => {
      const { items } = useMutationQueue.getState()
      if (items.length > 0) processQueue()
    }, 30000)
    return () => clearInterval(interval)
  }, [network, processQueue])
}
