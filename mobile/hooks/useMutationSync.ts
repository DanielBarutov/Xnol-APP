import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, transfersApi, accountsApi } from '@xnoll/shared'
import { useMutationQueue } from '../store/mutationQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { useUIStore } from '../store/ui'

export function useMutationSync() {
  const qc = useQueryClient()
  const network = useNetworkStatus()
  const processing = useRef(false)
  const showToast = useUIStore.getState().showToast

  async function processQueue() {
    if (processing.current) return
    const { items, remove } = useMutationQueue.getState()
    if (items.length === 0) return

    processing.current = true
    let processed = 0

    for (const item of [...items]) {
      try {
        if (item.type === 'transaction') {
          await transactionsApi.create(item.payload, item.id)
        } else if (item.type === 'transfer') {
          await transfersApi.create(item.payload, item.id)
        } else if (item.type === 'account') {
          await accountsApi.create(item.payload, item.id)
        }
        remove(item.id)
        processed++
      } catch {
        // Stop on first failure — retry next time network comes back
        break
      }
    }

    if (processed > 0) {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      showToast(`Отправлено ${processed} операций из очереди`, '#34d399')
    }

    processing.current = false
  }

  useEffect(() => {
    if (network === 'online') processQueue()
  }, [network])
}
