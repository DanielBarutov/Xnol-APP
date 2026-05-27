import { useQuery } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi, statsApi, transfersApi } from '@xnoll/shared'

export function useHomeData() {
  const accounts     = useQuery({ queryKey: ['accounts'],     queryFn: accountsApi.list })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list({ limit: 20 }) })
  const transfers    = useQuery({ queryKey: ['transfers'],    queryFn: transfersApi.list })
  const categories   = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list })
  const monthStats   = useQuery({ queryKey: ['stats', 'categories', 'this_month'], queryFn: () => statsApi.categories({ period: 'this_month' }) })

  const totalBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB') return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  return { accounts, transactions, transfers, categories, monthStats, totalBalance }
}
