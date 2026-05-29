import { useQuery } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi, statsApi, transfersApi, depositsApi } from '@xnoll/shared'

export function useHomeData() {
  const accounts     = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list({ include_deleted: true }) })
  const deposits     = useQuery({ queryKey: ['deposits'],     queryFn: depositsApi.list })
  const transactions = useQuery({ queryKey: ['transactions', { limit: 20 }], queryFn: () => transactionsApi.list({ limit: 20 }) })
  const transfers    = useQuery({ queryKey: ['transfers'],    queryFn: transfersApi.list })
  const categories   = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list })
  const monthStats   = useQuery({ queryKey: ['stats', 'categories', 'this_month'], queryFn: () => statsApi.categories({ period: 'this_month' }) })

  const accountBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB' && !a.is_deleted) return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  const depositBalance = deposits.data?.reduce((sum, d) => {
    if (d.currency === 'RUB') return sum + parseFloat(d.balance)
    return sum
  }, 0) ?? 0

  const totalBalance = accountBalance + depositBalance

  return { accounts, deposits, transactions, transfers, categories, monthStats, totalBalance }
}
