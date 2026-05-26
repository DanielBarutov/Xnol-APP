// frontend/src/features/transactions/hooks/useCreateTransaction.ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../../api/endpoints/transactions'
import { categoriesApi } from '../../../api/endpoints/categories'
import { accountsApi } from '../../../api/endpoints/accounts'
import { useUIStore } from '../../../store/ui'
import { COLORS } from '../../../shared/tokens'

export function useCreateTransaction() {
  const qc = useQueryClient()
  const { showToast, closeModal } = useUIStore()

  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  const mutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: (tx) => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      closeModal()
      showToast(
        `${tx.type === 'income' ? 'Доход' : 'Расход'} добавлен`,
        tx.type === 'income' ? COLORS.income : COLORS.expense,
      )
    },
    onError: () => showToast('Ошибка при сохранении', COLORS.expense),
  })

  return { mutation, categories, accounts }
}
