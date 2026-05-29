import { useRef, useEffect, useState, useCallback } from 'react'
import { Keyboard } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@xnoll/shared'
import { AddTxSheet } from '../features/transactions/AddTxSheet'
import { TransactionDetail } from '../features/transactions/TransactionDetailSheet'
import { TransferDetail } from '../features/transactions/TransferDetailSheet'
import { AllTransactionsSheet } from '../features/transactions/AllTransactionsSheet'
import { CategoriesSheet } from '../features/categories/CategoriesSheet'
import { CategoryFormSheet } from '../features/categories/CategoryFormSheet'
import { Sheet } from './Sheet'
import type { TransactionResponse, TransferResponse, CategoryResponse } from '@xnoll/shared'

function isTransaction(p: unknown): p is TransactionResponse {
  return typeof p === 'object' && p !== null && 'type' in p && 'amount' in p && ('category_id' in p)
}

function isTransfer(p: unknown): p is TransferResponse {
  return typeof p === 'object' && p !== null && 'source_type' in p && 'dest_type' in p
}

const DETAIL_SNAP_POINTS = ['45%'] as const
const TRANSFER_DETAIL_SNAP_POINTS = ['42%'] as const

export function SheetManager() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)

  const addTxRef = useRef<BottomSheet>(null)
  const detailRef = useRef<BottomSheet>(null)
  const transferDetailRef = useRef<BottomSheet>(null)
  const allTxRef = useRef<BottomSheet>(null)
  const categoriesRef = useRef<BottomSheet>(null)
  const categoryFormRef = useRef<BottomSheet>(null)

  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null)
  const [creatingType, setCreatingType] = useState<'expense' | 'income'>('expense')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: modal.type === 'categories',
  })

  const dismiss = useCallback(() => {
    Keyboard.dismiss()
    closeModal()
  }, [closeModal])

  useEffect(() => {
    if (modal.type === 'add-tx') addTxRef.current?.expand()
    else addTxRef.current?.close()
  }, [modal.type, modal.payload])

  useEffect(() => {
    if (modal.type === 'transaction-detail') detailRef.current?.expand()
    else detailRef.current?.close()
  }, [modal.type])

  useEffect(() => {
    if (modal.type === 'transfer-detail') transferDetailRef.current?.expand()
    else transferDetailRef.current?.close()
  }, [modal.type])

  useEffect(() => {
    if (modal.type === 'all-transactions') allTxRef.current?.expand()
    else allTxRef.current?.close()
  }, [modal.type])

  useEffect(() => {
    if (modal.type === 'categories') categoriesRef.current?.expand()
    else categoriesRef.current?.close()
  }, [modal.type])

  function handleEditCategory(cat: CategoryResponse) {
    Keyboard.dismiss()
    setEditingCategory(cat)
    setCreatingType(cat.type as 'expense' | 'income')
    categoryFormRef.current?.expand()
  }

  function handleCreateCategory(type: 'expense' | 'income') {
    Keyboard.dismiss()
    setEditingCategory(null)
    setCreatingType(type)
    categoryFormRef.current?.expand()
  }

  function handleFormSaved() {
    Keyboard.dismiss()
    categoryFormRef.current?.close()
  }

  return (
    <>
      <AddTxSheet ref={addTxRef} onCreated={dismiss} onClose={dismiss} />
      <AllTransactionsSheet
        ref={allTxRef}
        onClose={() => {
          Keyboard.dismiss()
          if (useUIStore.getState().modal.type === 'all-transactions') closeModal()
        }}
      />
      <CategoriesSheet
        ref={categoriesRef}
        onClose={dismiss}
        onEditCategory={handleEditCategory}
        onCreateCategory={handleCreateCategory}
      />
      <CategoryFormSheet
        ref={categoryFormRef}
        editing={editingCategory}
        defaultType={creatingType}
        categories={categories}
        onSaved={handleFormSaved}
        onClose={() => { Keyboard.dismiss(); categoryFormRef.current?.close() }}
      />
      <Sheet ref={detailRef} snapPoints={DETAIL_SNAP_POINTS} onClose={dismiss}>
        {isTransaction(modal.payload) && (
          <TransactionDetail transaction={modal.payload} onClose={dismiss} />
        )}
      </Sheet>
      <Sheet ref={transferDetailRef} snapPoints={TRANSFER_DETAIL_SNAP_POINTS} onClose={dismiss}>
        {isTransfer(modal.payload) && (
          <TransferDetail transfer={modal.payload} onClose={dismiss} />
        )}
      </Sheet>
    </>
  )
}
