# XNoll Frontend — Plan 06b: Screens + Modals + Docker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Plan 06a must be fully complete (auth working, app shell running).

**Goal:** Implement all five screens (Home, Accounts, Analytics, Profile) plus all modals (AddTxModal, TransferModal, DepositDetailModal, AccountDetailModal), wire each to the backend API, and add the frontend Docker service.

**Architecture:** Each screen lives in `features/<name>/`. API hooks use TanStack Query. Modals are mounted at the App root level and opened via Zustand `ui.openModal`. Charts use Recharts. Theme is applied via CSS variables set in App.tsx (Plan 06a).

**Tech Stack:** Same as 06a + Recharts for analytics charts.

---

## File Map

**New files (this plan):**
- `frontend/src/api/endpoints/accounts.ts`
- `frontend/src/api/endpoints/transactions.ts`
- `frontend/src/api/endpoints/categories.ts`
- `frontend/src/api/endpoints/deposits.ts`
- `frontend/src/api/endpoints/transfers.ts`
- `frontend/src/api/endpoints/stats.ts`
- `frontend/src/features/home/HomeScreen.tsx`
- `frontend/src/features/home/hooks/useHomeData.ts`
- `frontend/src/features/transactions/AddTxModal.tsx`
- `frontend/src/features/transactions/hooks/useCreateTransaction.ts`
- `frontend/src/features/accounts/AccountsScreen.tsx`
- `frontend/src/features/accounts/DepositDetailModal.tsx`
- `frontend/src/features/accounts/AccountDetailModal.tsx`
- `frontend/src/features/accounts/TransferModal.tsx`
- `frontend/src/features/accounts/hooks/useAccounts.ts`
- `frontend/src/features/analytics/AnalyticsScreen.tsx`
- `frontend/src/features/analytics/hooks/useStats.ts`
- `frontend/src/features/profile/ProfileScreen.tsx`
- `frontend/src/shared/components/ModalRoot.tsx`

**Modified files:**
- `frontend/src/App.tsx` — replace Placeholder components with real screens + ModalRoot
- `docker-compose.yml` — add frontend service

---

### Task 1: Remaining API endpoint files

**Files:**
- Create: `frontend/src/api/endpoints/accounts.ts`
- Create: `frontend/src/api/endpoints/transactions.ts`
- Create: `frontend/src/api/endpoints/categories.ts`
- Create: `frontend/src/api/endpoints/deposits.ts`
- Create: `frontend/src/api/endpoints/transfers.ts`
- Create: `frontend/src/api/endpoints/stats.ts`

- [ ] **Step 1: Write `accounts.ts`**

```ts
// frontend/src/api/endpoints/accounts.ts
import { api } from '../client'
import type { AccountResponse, CreateAccountRequest } from '../types'

export const accountsApi = {
  list: () => api.get<AccountResponse[]>('/api/v1/accounts').then(r => r.data),
  create: (data: CreateAccountRequest) => api.post<AccountResponse>('/api/v1/accounts', data).then(r => r.data),
  update: (id: string, data: Partial<CreateAccountRequest>) => api.put<AccountResponse>(`/api/v1/accounts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/accounts/${id}`),
}
```

- [ ] **Step 2: Write `transactions.ts`**

```ts
// frontend/src/api/endpoints/transactions.ts
import { api } from '../client'
import type { TransactionResponse, CreateTransactionRequest } from '../types'

export const transactionsApi = {
  list: (params?: { account_id?: string; limit?: number; offset?: number }) =>
    api.get<TransactionResponse[]>('/api/v1/transactions', { params }).then(r => r.data),
  create: (data: CreateTransactionRequest) =>
    api.post<TransactionResponse>('/api/v1/transactions', data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/transactions/${id}`),
}
```

- [ ] **Step 3: Write `categories.ts`**

```ts
// frontend/src/api/endpoints/categories.ts
import { api } from '../client'
import type { CategoryResponse, CreateCategoryRequest } from '../types'

export const categoriesApi = {
  list: () => api.get<CategoryResponse[]>('/api/v1/categories').then(r => r.data),
  create: (data: CreateCategoryRequest) => api.post<CategoryResponse>('/api/v1/categories', data).then(r => r.data),
}
```

- [ ] **Step 4: Write `deposits.ts`**

```ts
// frontend/src/api/endpoints/deposits.ts
import { api } from '../client'
import type { DepositResponse, CreateDepositRequest } from '../types'

export const depositsApi = {
  list: () => api.get<DepositResponse[]>('/api/v1/deposits').then(r => r.data),
  get: (id: string) => api.get<DepositResponse>(`/api/v1/deposits/${id}`).then(r => r.data),
  create: (data: CreateDepositRequest) => api.post<DepositResponse>('/api/v1/deposits', data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/deposits/${id}`),
}
```

- [ ] **Step 5: Write `transfers.ts`**

```ts
// frontend/src/api/endpoints/transfers.ts
import { api } from '../client'
import type { TransferResponse, CreateTransferRequest } from '../types'

export const transfersApi = {
  list: () => api.get<TransferResponse[]>('/api/v1/transfers').then(r => r.data),
  create: (data: CreateTransferRequest) => api.post<TransferResponse>('/api/v1/transfers', data).then(r => r.data),
}
```

- [ ] **Step 6: Write `stats.ts`**

```ts
// frontend/src/api/endpoints/stats.ts
import { api } from '../client'
import type { CategoryStatsResponse, TimelineResponse, AccountStatsResponse, StatPeriod } from '../types'

export const statsApi = {
  categories: (period: StatPeriod) =>
    api.get<CategoryStatsResponse>('/api/v1/stats/categories', { params: { period } }).then(r => r.data),
  timeline: (period: StatPeriod, granularity: 'month' | 'day' = 'month') =>
    api.get<TimelineResponse>('/api/v1/stats/timeline', { params: { period, granularity } }).then(r => r.data),
  accounts: (period: StatPeriod) =>
    api.get<AccountStatsResponse>('/api/v1/stats/accounts', { params: { period } }).then(r => r.data),
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/endpoints/
git commit -m "feat: all API endpoint modules (accounts, transactions, categories, deposits, transfers, stats)"
```

---

### Task 2: Home screen

**Files:**
- Create: `frontend/src/features/home/HomeScreen.tsx`
- Create: `frontend/src/features/home/hooks/useHomeData.ts`

- [ ] **Step 1: Write `useHomeData.ts`**

```ts
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
```

- [ ] **Step 2: Write `HomeScreen.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/home/
git commit -m "feat: Home screen with balance card + transaction list"
```

---

### Task 3: AddTxModal

**Files:**
- Create: `frontend/src/features/transactions/AddTxModal.tsx`
- Create: `frontend/src/features/transactions/hooks/useCreateTransaction.ts`

- [ ] **Step 1: Write `useCreateTransaction.ts`**

```ts
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
```

- [ ] **Step 2: Write `AddTxModal.tsx`**

```tsx
// frontend/src/features/transactions/AddTxModal.tsx
import { useState, useEffect } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { useCreateTransaction } from './hooks/useCreateTransaction'
import { categoryEmoji, formatAmount } from '../../shared/lib/format'
import { Icons } from '../../shared/icons'
import { COLORS } from '../../shared/tokens'

const KEYPAD = ['1','2','3','4','5','6','7','8','9','.','0','←']

export function AddTxModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'add-tx'
  const defaultKind = (modal.payload as { kind?: string })?.kind === 'income' ? 'income' : 'expense'

  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<'income' | 'expense'>(defaultKind)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')

  const { mutation, categories, accounts } = useCreateTransaction()

  useEffect(() => {
    if (open) {
      setStep(1); setAmount(''); setCategoryId(''); setKind(defaultKind)
      if (accounts.data?.[0]) setAccountId(accounts.data[0].id)
    }
  }, [open])

  useEffect(() => {
    if (accounts.data?.[0] && !accountId) setAccountId(accounts.data[0].id)
  }, [accounts.data])

  const accent = kind === 'income' ? COLORS.income : COLORS.expense
  const filteredCats = categories.data?.filter(c => c.type === kind) ?? []

  const onKey = (k: string) => {
    if (k === '←') return setAmount(a => a.slice(0, -1))
    if (k === '.' && amount.includes('.')) return
    if (amount.length >= 10) return
    setAmount(a => (a === '0' && k !== '.') ? k : a + k)
  }

  const submit = () => {
    if (!categoryId || !accountId || !parseFloat(amount)) return
    mutation.mutate({
      account_id: accountId,
      category_id: categoryId,
      type: kind,
      amount: parseFloat(amount).toFixed(2),
      date: new Date().toISOString().slice(0, 10),
    })
  }

  const selectedAccount = accounts.data?.find(a => a.id === accountId)
  const selectedCat = categories.data?.find(c => c.id === categoryId)

  return (
    <Modal open={open} onClose={closeModal}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px 14px' }}>
        {step > 1
          ? <button onClick={() => setStep(s => s - 1)} style={iconBtn}>{Icons.chev(16)}</button>
          : <div style={{ width: 38 }} />}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Шаг {step} из 3 · {kind === 'income' ? 'Доход' : 'Расход'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginTop: 2 }}>
            {step === 1 ? 'Сумма' : step === 2 ? 'Категория' : 'Подтвердите'}
          </div>
        </div>
        <button onClick={closeModal} style={iconBtn}>{Icons.close(22)}</button>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 18px' }}>
        {[1,2,3].map(n => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: n <= step ? accent : COLORS.border, transition: 'background 0.2s' }} />
        ))}
      </div>

      {/* Step 1: keypad */}
      {step === 1 && (
        <div>
          {/* Kind toggle */}
          <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
            {(['income', 'expense'] as const).map(k => (
              <button key={k} onClick={() => setKind(k)} style={{
                flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
                background: kind === k ? (k === 'income' ? `${COLORS.income}22` : `${COLORS.expense}22`) : COLORS.surface2,
                border: `1.5px solid ${kind === k ? (k === 'income' ? COLORS.income : COLORS.expense) : COLORS.border}`,
                color: kind === k ? (k === 'income' ? COLORS.income : COLORS.expense) : COLORS.textSecondary,
                cursor: 'pointer',
              }}>{k === 'income' ? '+ Доход' : '− Расход'}</button>
            ))}
          </div>
          <div style={{ padding: '0 20px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: amount ? accent : COLORS.textMuted }}>
              <span style={{ fontSize: 26, opacity: 0.7 }}>{kind === 'income' ? '+' : '−'}</span>
              {amount || '0'}
              <span style={{ fontSize: 24, opacity: 0.5, color: COLORS.textSecondary, marginLeft: 4 }}>₽</span>
            </div>
          </div>
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {KEYPAD.map(k => (
              <button key={k} onClick={() => onKey(k)} style={{
                padding: '14px 0', fontSize: 22, fontWeight: 600,
                background: COLORS.surface2, color: k === '←' ? COLORS.textSecondary : COLORS.textPrimary,
                border: `1px solid ${COLORS.border}`, borderRadius: 14, cursor: 'pointer',
              }}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: category + account */}
      {step === 2 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
            {kind === 'income' ? 'Источник' : 'Категория расхода'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {filteredCats.map(cat => {
              const sel = cat.id === categoryId
              return (
                <button key={cat.id} onClick={() => setCategoryId(cat.id)} style={{
                  padding: '14px 8px', borderRadius: 16,
                  background: sel ? `${accent}22` : COLORS.surface2,
                  border: `1.5px solid ${sel ? `${accent}99` : COLORS.border}`,
                  color: sel ? accent : COLORS.textSecondary,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 22 }}>{cat.icon || categoryEmoji(cat.name)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{cat.name}</span>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
            {kind === 'income' ? 'Зачислить на счёт' : 'Списать со счёта'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {accounts.data?.map(a => {
              const sel = a.id === accountId
              return (
                <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 14,
                  background: sel ? COLORS.surface2 : `${COLORS.surface}88`,
                  border: `1.5px solid ${sel ? 'var(--accent)' : COLORS.border}`,
                  color: COLORS.textPrimary, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ color: 'var(--accent)' }}>{Icons.card(14)}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.bank_name} · {a.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{parseFloat(a.balance).toLocaleString('ru-RU')} {a.currency === 'RUB' ? '₽' : a.currency}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: confirmation */}
      {step === 3 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ padding: 18, borderRadius: 22, background: `${accent}12`, border: `1px solid ${accent}33`, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: accent, marginBottom: 8 }}>
              {kind === 'income' ? '+' : '−'}{formatAmount(parseFloat(amount) || 0)} ₽
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: COLORS.textSecondary }}>{kind === 'income' ? 'Источник' : 'Категория'}</span>
              <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{selectedCat?.name ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
              <span style={{ color: COLORS.textSecondary }}>Счёт</span>
              <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{selectedAccount ? `${selectedAccount.bank_name} · ${selectedAccount.name}` : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer button */}
      <div style={{ padding: '18px 20px 0' }}>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 ? !parseFloat(amount) : !categoryId}
            style={submitBtn(step === 1 ? !!parseFloat(amount) : !!categoryId, accent)}
          >
            Далее {Icons.chev(14)}
          </button>
        ) : (
          <button onClick={submit} disabled={mutation.isPending} style={submitBtn(!mutation.isPending, accent)}>
            {mutation.isPending ? 'Сохраняем...' : 'Подтвердить и сохранить'}
          </button>
        )}
      </div>
    </Modal>
  )
}

const iconBtn: React.CSSProperties = { background: 'none', border: 0, cursor: 'pointer', color: COLORS.textSecondary, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10 }
const submitBtn = (active: boolean, accent: string): React.CSSProperties => ({
  width: '100%', padding: 15, background: active ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : COLORS.surface2,
  color: active ? '#0a0e1a' : COLORS.textSecondary, border: 0, borderRadius: 16, fontSize: 14.5,
  fontWeight: 700, cursor: active ? 'pointer' : 'default',
  boxShadow: active ? `0 10px 22px ${accent}40` : 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/transactions/
git commit -m "feat: AddTxModal 3-step wizard wired to API"
```

---

### Task 4: Accounts screen + modals

**Files:**
- Create: `frontend/src/features/accounts/AccountsScreen.tsx`
- Create: `frontend/src/features/accounts/DepositDetailModal.tsx`
- Create: `frontend/src/features/accounts/AccountDetailModal.tsx`
- Create: `frontend/src/features/accounts/TransferModal.tsx`
- Create: `frontend/src/features/accounts/hooks/useAccounts.ts`

- [ ] **Step 1: Write `useAccounts.ts`**

```ts
// frontend/src/features/accounts/hooks/useAccounts.ts
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
```

- [ ] **Step 2: Write `AccountsScreen.tsx`**

```tsx
// frontend/src/features/accounts/AccountsScreen.tsx
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
        <button onClick={() => openModal('transfer')} style={{
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: 'var(--accent-tint)', border: '1px solid var(--accent)44',
          color: 'var(--accent)', cursor: 'pointer',
        }}>Перевод</button>
      </div>

      {/* Savings accounts */}
      {(accounts.data?.length ?? 0) > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Накопительные счета</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {accounts.data?.map((a, i) => (
              <button key={a.id} onClick={() => openModal('account-detail', { accountId: a.id })} style={{
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

      {/* Deposits */}
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
```

- [ ] **Step 3: Write `DepositDetailModal.tsx`**

```tsx
// frontend/src/features/accounts/DepositDetailModal.tsx
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { depositsApi } from '../../api/endpoints/deposits'
import { formatCurrency } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'

export function DepositDetailModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'deposit-detail'
  const depositId = (modal.payload as { depositId?: string })?.depositId

  const { data } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
  })

  const rows = data ? [
    ['Банк', data.bank_name],
    ['Сумма', formatCurrency(parseFloat(data.amount), data.currency)],
    ['Баланс', formatCurrency(parseFloat(data.balance), data.currency)],
    ['Ставка', `${data.interest_rate}% (${data.interest_type === 'compound' ? 'сложные' : 'простые'})`],
    ['Открыт', data.open_date],
    ['Закрыть', data.close_date],
    ['Автопролонгация', data.auto_renew ? 'Да' : 'Нет'],
    ['Статус', data.status],
  ] : []

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>Детали вклада</div>
        {data && (
          <div style={{ background: COLORS.surface2, borderRadius: 16, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none', fontSize: 13 }}>
                <span style={{ color: COLORS.textSecondary }}>{k}</span>
                <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {!data && <div style={{ color: COLORS.textSecondary }}>Загрузка...</div>}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Write `AccountDetailModal.tsx`**

```tsx
// frontend/src/features/accounts/AccountDetailModal.tsx
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
```

- [ ] **Step 5: Write `TransferModal.tsx`**

```tsx
// frontend/src/features/accounts/TransferModal.tsx
import { useState, useEffect } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { useAccounts, useCreateTransfer } from './hooks/useAccounts'
import { COLORS } from '../../shared/tokens'
import { Icons } from '../../shared/icons'

export function TransferModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'transfer'
  const { accounts, deposits } = useAccounts()
  const transfer = useCreateTransfer()

  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState<'savings_account' | 'deposit'>('savings_account')
  const [sourceId, setSourceId] = useState('')
  const [destType, setDestType] = useState<'savings_account' | 'deposit'>('savings_account')
  const [destId, setDestId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('RUB')

  useEffect(() => {
    if (open) { setStep(1); setAmount(''); setSourceId(''); setDestId('') }
  }, [open])

  const sourceItems = sourceType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])
  const destItems = destType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])

  const submit = () => {
    if (!sourceId || !destId || !parseFloat(amount)) return
    transfer.mutate({ source_type: sourceType, source_id: sourceId, dest_type: destType, dest_id: destId, amount: parseFloat(amount).toFixed(2), currency, date: new Date().toISOString().slice(0, 10) })
  }

  const KEYPAD = ['1','2','3','4','5','6','7','8','9','.','0','←']
  const onKey = (k: string) => {
    if (k === '←') return setAmount(a => a.slice(0, -1))
    if (k === '.' && amount.includes('.')) return
    if (amount.length >= 10) return
    setAmount(a => (a === '0' && k !== '.') ? k : a + k)
  }

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 18px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 4 }}>Перевод</div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 }}>Шаг {step} из 2</div>
      </div>

      {step === 1 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Откуда</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['savings_account', 'deposit'] as const).map(t => (
              <button key={t} onClick={() => { setSourceType(t); setSourceId('') }} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 600, background: sourceType === t ? 'var(--accent-tint)' : COLORS.surface2, border: `1.5px solid ${sourceType === t ? 'var(--accent)' : COLORS.border}`, color: sourceType === t ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer' }}>
                {t === 'savings_account' ? 'Счёт' : 'Вклад'}
              </button>
            ))}
          </div>
          {sourceItems.map(item => (
            <button key={item.id} onClick={() => setSourceId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 14, background: sourceId === item.id ? COLORS.surface2 : `${COLORS.surface}88`, border: `1.5px solid ${sourceId === item.id ? 'var(--accent)' : COLORS.border}`, color: COLORS.textPrimary, cursor: 'pointer', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.bank_name} · {item.name}</span>
            </button>
          ))}

          <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Куда</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['savings_account', 'deposit'] as const).map(t => (
              <button key={t} onClick={() => { setDestType(t); setDestId('') }} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 600, background: destType === t ? 'var(--accent-tint)' : COLORS.surface2, border: `1.5px solid ${destType === t ? 'var(--accent)' : COLORS.border}`, color: destType === t ? 'var(--accent)' : COLORS.textSecondary, cursor: 'pointer' }}>
                {t === 'savings_account' ? 'Счёт' : 'Вклад'}
              </button>
            ))}
          </div>
          {destItems.map(item => (
            <button key={item.id} onClick={() => setDestId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 14, background: destId === item.id ? COLORS.surface2 : `${COLORS.surface}88`, border: `1.5px solid ${destId === item.id ? 'var(--accent)' : COLORS.border}`, color: COLORS.textPrimary, cursor: 'pointer', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.bank_name} · {item.name}</span>
            </button>
          ))}

          <button onClick={() => setStep(2)} disabled={!sourceId || !destId} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 16, fontSize: 14, fontWeight: 700, background: (sourceId && destId) ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2, color: (sourceId && destId) ? '#fff' : COLORS.textSecondary, border: 0, cursor: (sourceId && destId) ? 'pointer' : 'default' }}>
            Далее {Icons.chev(14)}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ padding: '0 0 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: amount ? 'var(--accent)' : COLORS.textMuted }}>
              {amount || '0'} <span style={{ fontSize: 24, color: COLORS.textSecondary }}>₽</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
            {KEYPAD.map(k => (
              <button key={k} onClick={() => onKey(k)} style={{ padding: '14px 0', fontSize: 22, fontWeight: 600, background: COLORS.surface2, color: k === '←' ? COLORS.textSecondary : COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 14, cursor: 'pointer' }}>{k}</button>
            ))}
          </div>
          <button onClick={submit} disabled={!parseFloat(amount) || transfer.isPending} style={{ width: '100%', padding: 14, borderRadius: 16, fontSize: 14, fontWeight: 700, background: parseFloat(amount) ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2, color: parseFloat(amount) ? '#fff' : COLORS.textSecondary, border: 0, cursor: parseFloat(amount) ? 'pointer' : 'default' }}>
            {transfer.isPending ? 'Переводим...' : 'Подтвердить перевод'}
          </button>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/accounts/
git commit -m "feat: Accounts screen + DepositDetailModal + AccountDetailModal + TransferModal"
```

---

### Task 5: Analytics screen

**Files:**
- Create: `frontend/src/features/analytics/AnalyticsScreen.tsx`
- Create: `frontend/src/features/analytics/hooks/useStats.ts`

- [ ] **Step 1: Write `useStats.ts`**

```ts
// frontend/src/features/analytics/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../../../api/endpoints/stats'
import type { StatPeriod } from '../../../api/types'

export function useStats(period: StatPeriod) {
  const categories = useQuery({ queryKey: ['stats', 'categories', period], queryFn: () => statsApi.categories(period) })
  const timeline = useQuery({ queryKey: ['stats', 'timeline', period], queryFn: () => statsApi.timeline(period) })
  const accounts = useQuery({ queryKey: ['stats', 'accounts', period], queryFn: () => statsApi.accounts(period) })
  return { categories, timeline, accounts }
}
```

- [ ] **Step 2: Write `AnalyticsScreen.tsx`**

```tsx
// frontend/src/features/analytics/AnalyticsScreen.tsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { useStats } from './hooks/useStats'
import { formatAmount } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'
import type { StatPeriod } from '../../api/types'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'this_month', label: 'Месяц' },
  { value: 'prev_month', label: 'Прошлый' },
  { value: 'this_year', label: 'Год' },
]

const PIE_COLORS = ['#6366f1','#ec4899','#34d399','#f59e0b','#06b6d4','#a855f7','#f87171','#10b981']

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<StatPeriod>('this_month')
  const { categories, timeline } = useStats(period)

  const expenseData = categories.data?.expense_by_category.map(c => ({
    name: c.category_name, value: Math.abs(parseFloat(c.amount)),
  })) ?? []

  const timelineData = timeline.data?.periods.map(p => ({
    name: p.period,
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  })) ?? []

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 20 }}>Аналитика</div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} style={{
            flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 600,
            background: period === p.value ? 'var(--accent-tint)' : COLORS.surface2,
            border: `1.5px solid ${period === p.value ? 'var(--accent)' : COLORS.border}`,
            color: period === p.value ? 'var(--accent)' : COLORS.textSecondary,
            cursor: 'pointer',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Summary */}
      {categories.data && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.income}12`, border: `1px solid ${COLORS.income}33` }}>
            <div style={{ fontSize: 11, color: COLORS.income, fontWeight: 600, marginBottom: 4 }}>ДОХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.income }}>+{formatAmount(parseFloat(categories.data.total_income))} ₽</div>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.expense}12`, border: `1px solid ${COLORS.expense}33` }}>
            <div style={{ fontSize: 11, color: COLORS.expense, fontWeight: 600, marginBottom: 4 }}>РАСХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.expense }}>−{formatAmount(Math.abs(parseFloat(categories.data.total_expense)))} ₽</div>
          </div>
        </div>
      )}

      {/* Timeline bar chart */}
      {timelineData.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Доходы / Расходы</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timelineData} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v: number) => `${formatAmount(v)} ₽`}
              />
              <Bar dataKey="income" fill={COLORS.income} radius={[6,6,0,0]} maxBarSize={24} name="Доход" />
              <Bar dataKey="expense" fill={COLORS.expense} radius={[6,6,0,0]} maxBarSize={24} name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie chart */}
      {expenseData.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Расходы по категориям</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <PieChart width={140} height={140}>
              <Pie data={expenseData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {expenseData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenseData.slice(0, 5).map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: COLORS.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>{formatAmount(item.value)} ₽</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {categories.isLoading && <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка статистики...</div>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analytics/
git commit -m "feat: Analytics screen with Recharts (timeline + expense pie)"
```

---

### Task 6: Profile screen

**Files:**
- Create: `frontend/src/features/profile/ProfileScreen.tsx`

- [ ] **Step 1: Write `ProfileScreen.tsx`**

```tsx
// frontend/src/features/profile/ProfileScreen.tsx
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { THEMES, COLORS } from '../../shared/tokens'
import { Icons } from '../../shared/icons'

export function ProfileScreen() {
  const { theme, setTheme, balanceVisible, toggleBalance } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 20, background: 'var(--accent-tint)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
          {user?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>{user?.full_name ?? '—'}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      {/* Theme picker */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Тема</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {(Object.entries(THEMES) as [keyof typeof THEMES, typeof THEMES[keyof typeof THEMES]][]).map(([k, v]) => (
            <button key={k} onClick={() => setTheme(k)} style={{
              padding: 12, borderRadius: 16, textAlign: 'left',
              background: theme === k ? COLORS.surface2 : `${COLORS.surface}88`,
              border: `1.5px solid ${theme === k ? v.accent : COLORS.border}`,
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {v.swatches.map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 6, background: c }} />)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{v.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings rows */}
      <div style={{ background: COLORS.surface2, borderRadius: 18, overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <button onClick={toggleBalance} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', background: 'none', border: 0, borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.textPrimary }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Скрыть баланс</span>
          <div style={{ width: 44, height: 26, borderRadius: 99, background: balanceVisible ? COLORS.border : 'var(--accent)', transition: 'background 0.2s', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 3, left: balanceVisible ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 0, borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.textSecondary }}>
          {Icons.gear(16)}<span style={{ fontSize: 14 }}>Настройки</span>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 0, cursor: 'pointer', color: COLORS.textSecondary }}>
          {Icons.help(16)}<span style={{ fontSize: 14 }}>Помощь</span>
        </button>
      </div>

      <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: `${COLORS.expense}12`, border: `1px solid ${COLORS.expense}33`, borderRadius: 16, cursor: 'pointer', color: COLORS.expense }}>
        {Icons.logout(16)}<span style={{ fontSize: 14, fontWeight: 600 }}>Выйти</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/profile/
git commit -m "feat: Profile screen (theme picker, balance toggle, logout)"
```

---

### Task 7: ModalRoot + wire everything into App.tsx

**Files:**
- Create: `frontend/src/shared/components/ModalRoot.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `ModalRoot.tsx`**

```tsx
// frontend/src/shared/components/ModalRoot.tsx
import { AddTxModal } from '../../features/transactions/AddTxModal'
import { TransferModal } from '../../features/accounts/TransferModal'
import { DepositDetailModal } from '../../features/accounts/DepositDetailModal'
import { AccountDetailModal } from '../../features/accounts/AccountDetailModal'

export function ModalRoot() {
  return (
    <>
      <AddTxModal />
      <TransferModal />
      <DepositDetailModal />
      <AccountDetailModal />
    </>
  )
}
```

- [ ] **Step 2: Update `App.tsx` — replace Placeholder imports with real screens**

Replace the existing `App.tsx` (from Plan 06a) with:

```tsx
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DevFrame } from './shared/components/DevFrame'
import { BottomNav } from './shared/components/BottomNav'
import { Toast } from './shared/components/Toast'
import { ModalRoot } from './shared/components/ModalRoot'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { useUIStore } from './store/ui'
import { THEMES } from './shared/tokens'
import { LoginScreen } from './features/auth/LoginScreen'
import { RegisterScreen } from './features/auth/RegisterScreen'
import { HomeScreen } from './features/home/HomeScreen'
import { AccountsScreen } from './features/accounts/AccountsScreen'
import { AnalyticsScreen } from './features/analytics/AnalyticsScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'

function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<BottomNav /></>
}

export default function App() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const t = THEMES[theme]
    const r = document.documentElement
    r.style.setProperty('--accent', t.accent)
    r.style.setProperty('--accent-2', t.accent2)
    r.style.setProperty('--accent-3', t.accent3)
    r.style.setProperty('--accent-glow', t.glow)
    r.style.setProperty('--accent-shadow', t.shadow)
    r.style.setProperty('--accent-tint', t.accent + '22')
  }, [theme])

  return (
    <DevFrame>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(ellipse at top, #11162a 0%, #060914 50%, #04060d 100%)', color: '#e6e9f2', overflowY: 'auto' }}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ScreenLayout><HomeScreen /></ScreenLayout>} />
            <Route path="/accounts" element={<ScreenLayout><AccountsScreen /></ScreenLayout>} />
            <Route path="/analytics" element={<ScreenLayout><AnalyticsScreen /></ScreenLayout>} />
            <Route path="/profile" element={<ScreenLayout><ProfileScreen /></ScreenLayout>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ModalRoot />
        <Toast />
      </div>
    </DevFrame>
  )
}
```

- [ ] **Step 3: Fetch user on app start — add to `main.tsx`**

Add after `QueryClientProvider` mounts, in `App.tsx` inside a `useEffect`:

```tsx
// Inside App() function, after theme useEffect:
const { accessToken, setUser } = useAuthStore()
const qc = useQueryClient()
useEffect(() => {
  if (accessToken) {
    authApi.me().then(setUser).catch(() => {})
  }
}, [accessToken])
```

Import `authApi` and `useAuthStore` at the top of `App.tsx`.

- [ ] **Step 4: Run full smoke test**

```bash
cd frontend && npm run dev
```

1. Open `http://localhost:5173` → redirects to `/login`
2. Register new user → redirects to Home, balance card visible
3. Add transaction → AddTxModal opens, 3 steps work, success toast
4. Switch to Accounts tab → accounts list renders
5. Tap Перевод → TransferModal opens
6. Switch to Analytics → charts render after first transactions
7. Switch to Profile → theme picker changes accent colour
8. Logout → redirects to `/login`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: wire all screens + ModalRoot into App"
```

---

### Task 8: Docker frontend service

**Files:**
- Create: `frontend/Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Write `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 2: Add frontend service to `docker-compose.yml`**

```yaml
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://api:8000
      - VITE_DEV_FRAME=true
    depends_on:
      - api
```

- [ ] **Step 3: Update CORS to include Docker origin**

In `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://frontend:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 4: Test full Docker stack**

```bash
cd /home/daniel/xnoll && docker-compose up --build
```

Expected: frontend at `http://localhost:5173`, api at `http://localhost:8000`.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile docker-compose.yml backend/app/main.py
git commit -m "feat: Docker frontend service; update CORS for container origins"
```

---

## End of Plan 06b

**All screens and modals are now implemented and wired to the backend.** The app is fully functional end-to-end: register → login → manage accounts/deposits → add transactions → view analytics → switch themes → logout.
