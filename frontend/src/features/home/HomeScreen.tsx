// frontend/src/features/home/HomeScreen.tsx
import { useHomeData } from './hooks/useHomeData'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { formatCurrency, formatDate, categoryEmoji } from '../../shared/lib/format'
import { Icons } from '../../shared/icons'
import { COLORS } from '../../shared/tokens'

export function HomeScreen() {
  const { transactions, totalBalance } = useHomeData()
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Привет, {user?.full_name?.split(' ')[0] ?? 'друг'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginTop: 2 }}>Мои финансы</div>
        </div>
        <button onClick={() => {}} style={{ width: 36, height: 36, borderRadius: 12, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, display: 'grid', placeItems: 'center', cursor: 'pointer', color: COLORS.textSecondary }}>
          {Icons.bell(16)}
        </button>
      </div>

      {/* Balance card */}
      <div style={{ margin: '20px 20px 0', padding: '22px 22px 18px', borderRadius: 24, background: 'linear-gradient(135deg, var(--accent)22, var(--accent-2)12)', border: `1px solid var(--accent)33` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5 }}>ОБЩИЙ БАЛАНС</span>
          <button onClick={toggleBalance} style={{ background: 'none', border: 0, color: COLORS.textSecondary, cursor: 'pointer', padding: 4 }}>
            {balanceVisible ? '👁' : '👁‍🗨'}
          </button>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: COLORS.textPrimary }}>
          {balanceVisible ? formatCurrency(totalBalance, 'RUB') : '••••••'}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 20px 0' }}>
        <button onClick={() => openModal('add-tx', { kind: 'income' })} style={actionBtn(COLORS.income)}>
          + Доход
        </button>
        <button onClick={() => openModal('add-tx', { kind: 'expense' })} style={actionBtn(COLORS.expense)}>
          − Расход
        </button>
      </div>

      {/* Transactions */}
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Последние операции</div>
        {transactions.isLoading && <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка...</div>}
        {transactions.data?.map(tx => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0',
            borderBottom: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: COLORS.surface2, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>
              {categoryEmoji(tx.description ?? '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.description || 'Операция'}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{formatDate(tx.date)}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tx.type === 'income' ? COLORS.income : COLORS.expense, flexShrink: 0 }}>
              {tx.type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(parseFloat(tx.amount)), 'RUB')}
            </div>
          </div>
        ))}
        {transactions.data?.length === 0 && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Операций пока нет</div>
        )}
      </div>
    </div>
  )
}

const actionBtn = (color: string): React.CSSProperties => ({
  flex: 1, padding: '12px 0', borderRadius: 16, fontSize: 14, fontWeight: 700,
  background: `${color}18`, border: `1.5px solid ${color}44`, color,
  cursor: 'pointer',
})
