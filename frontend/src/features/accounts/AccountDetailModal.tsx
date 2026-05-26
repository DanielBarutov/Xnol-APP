import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { accountsApi } from '../../api/endpoints/accounts'
import { formatCurrency, formatDate } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'

export function AccountDetailModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'account-detail'
  const accountId = (modal.payload as { accountId?: string })?.accountId

  const account = useQuery({ queryKey: ['accounts', accountId], queryFn: () => accountsApi.list().then(r => r.find(a => a.id === accountId)), enabled: open && !!accountId })
  const txs = useQuery({ queryKey: ['transactions', accountId], queryFn: () => transactionsApi.list({ account_id: accountId }), enabled: open && !!accountId })

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 4 }}>
          {account.data ? `${account.data.bank_name} · ${account.data.name}` : 'Счёт'}
        </div>
        {account.data && (
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>
            {formatCurrency(parseFloat(account.data.balance), account.data.currency)}
          </div>
        )}
        <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Операции</div>
        {txs.data?.map(tx => (
          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
            <div>
              <div style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{tx.description || 'Операция'}</div>
              <div style={{ color: COLORS.textSecondary, marginTop: 2 }}>{formatDate(tx.date)}</div>
            </div>
            <div style={{ color: tx.type === 'income' ? COLORS.income : COLORS.expense, fontWeight: 700 }}>
              {tx.type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(parseFloat(tx.amount)), 'RUB')}
            </div>
          </div>
        ))}
        {txs.data?.length === 0 && <div style={{ color: COLORS.textSecondary, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Операций нет</div>}
      </div>
    </Modal>
  )
}
