import { useRef, useEffect, useState, useCallback } from 'react'
import { Keyboard } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@xnoll/shared'
import { AddTxSheet } from '../features/transactions/AddTxSheet'
import { TransactionDetail } from '../features/transactions/TransactionDetailSheet'
import { AllTransactionsSheet } from '../features/transactions/AllTransactionsSheet'
import { CategoriesSheet } from '../features/categories/CategoriesSheet'
import { CategoryFormSheet } from '../features/categories/CategoryFormSheet'
import { Sheet } from './Sheet'
import type { TransactionResponse, CategoryResponse } from '@xnoll/shared'

function isTransaction(p: unknown): p is TransactionResponse {
  return typeof p === 'object' && p !== null && 'type' in p && 'amount' in p
}

const DETAIL_SNAP_POINTS = ['45%'] as const

export function SheetManager() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)

  const addTxRef = useRef<BottomSheet>(null)
  const detailRef = useRef<BottomSheet>(null)
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
    </>
  )
}
