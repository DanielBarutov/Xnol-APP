import { useAccounts } from './hooks/useAccounts'
import { useUIStore } from '../../store/ui'
import { formatCurrency } from '../../shared/lib/format'
import { Icons } from '../../shared/icons'
import { COLORS } from '../../shared/tokens'

const TAG_COLORS = ['#60a5fa','#ec4899','#34d399','#a78bfa','#fb923c','#f87171']

export function AccountsScreen() {
  const { accounts, deposits } = useAccounts()
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary }}>Счета</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openModal('create-account')} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
            color: COLORS.textSecondary, cursor: 'pointer',
          }}>+ Счёт</button>
          <button onClick={() => openModal('create-deposit')} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
            color: COLORS.textSecondary, cursor: 'pointer',
          }}>+ Вклад</button>
          <button onClick={() => openModal('transfer')} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: 'var(--accent-tint)', border: '1px solid var(--accent)44',
            color: 'var(--accent)', cursor: 'pointer',
          }}>Перевод</button>
        </div>
      </div>

      {(accounts.data?.length ?? 0) > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Накопительные счета</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {accounts.data?.map((a, i) => (
              <button key={a.id} onClick={() => openModal('account-edit', { accountId: a.id })} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 18,
                background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${TAG_COLORS[i % TAG_COLORS.length]}22`, display: 'grid', placeItems: 'center', color: TAG_COLORS[i % TAG_COLORS.length] }}>
                  {Icons.card(18)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>{a.bank_name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{a.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>{formatCurrency(parseFloat(a.balance), a.currency)}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {(deposits.data?.length ?? 0) > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Вклады</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {deposits.data?.map((d, i) => (
              <button key={d.id} onClick={() => openModal('deposit-detail', { depositId: d.id })} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 18,
                background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${TAG_COLORS[(i + 2) % TAG_COLORS.length]}22`, display: 'grid', placeItems: 'center', color: TAG_COLORS[(i + 2) % TAG_COLORS.length] }}>
                  💰
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>{d.bank_name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{parseFloat(d.interest_rate)}% · до {d.close_date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>{formatCurrency(parseFloat(d.balance), d.currency)}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {accounts.isLoading && deposits.isLoading && (
        <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка...</div>
      )}
    </div>
  )
}
