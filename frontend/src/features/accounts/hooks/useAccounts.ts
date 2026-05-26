import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../../../api/endpoints/accounts'
import { depositsApi } from '../../../api/endpoints/deposits'
import { transfersApi } from '../../../api/endpoints/transfers'
import { useUIStore } from '../../../store/ui'
import { COLORS } from '../../../shared/tokens'

export function useAccounts() {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const deposits = useQuery({ queryKey: ['deposits'], queryFn: depositsApi.list })
  return { accounts, deposits }
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  const { showToast, closeModal } = useUIStore()
  return useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['deposits'] })
      closeModal()
      showToast('Перевод выполнен', COLORS.income)
    },
    onError: () => showToast('Ошибка перевода', COLORS.expense),
  })
}
