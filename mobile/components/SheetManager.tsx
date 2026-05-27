import { useRef, useEffect } from 'react'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { AddTxSheet } from '../features/transactions/AddTxSheet'
import { TransactionDetail } from '../features/transactions/TransactionDetailSheet'
import { Sheet } from './Sheet'
import type { TransactionResponse } from '@xnoll/shared'

export function SheetManager() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)
  const addTxRef = useRef<BottomSheet>(null)
  const detailRef = useRef<BottomSheet>(null)

  useEffect(() => {
    if (modal.type === 'add-tx') addTxRef.current?.expand()
    else addTxRef.current?.close()
  }, [modal.type])

  useEffect(() => {
    if (modal.type === 'transaction-detail') detailRef.current?.expand()
    else detailRef.current?.close()
  }, [modal.type])

  return (
    <>
      <AddTxSheet ref={addTxRef} onCreated={closeModal} />
      <Sheet ref={detailRef} snapPoints={['45%']} onClose={closeModal}>
        {modal.type === 'transaction-detail' && modal.payload ? (
          <TransactionDetail transaction={modal.payload as TransactionResponse} onClose={closeModal} />
        ) : null}
      </Sheet>
    </>
  )
}
