// frontend/src/features/home/hooks/useHomeData.ts
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../../api/endpoints/transactions'
import { accountsApi } from '../../../api/endpoints/accounts'
import { categoriesApi } from '../../../api/endpoints/categories'
import { statsApi } from '../../../api/endpoints/stats'
import { transfersApi } from '../../../api/endpoints/transfers'

export function useHomeData() {
  const accounts    = useQuery({ queryKey: ['accounts'],    queryFn: accountsApi.list })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list({ limit: 20 }) })
  const transfers   = useQuery({ queryKey: ['transfers'],   queryFn: () => transfersApi.list() })
  const categories  = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list })
  const monthStats  = useQuery({ queryKey: ['stats', 'categories', 'this_month'], queryFn: () => statsApi.categories({ period: 'this_month' }) })

  const totalBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB') return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  return { accounts, transactions, transfers, categories, monthStats, totalBalance }
}
