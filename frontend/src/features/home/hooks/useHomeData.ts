// frontend/src/features/home/hooks/useHomeData.ts
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../../api/endpoints/transactions'
import { accountsApi } from '../../../api/endpoints/accounts'

export function useHomeData() {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list({ limit: 20 }) })

  const totalBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB') return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  return { accounts, transactions, totalBalance }
}
