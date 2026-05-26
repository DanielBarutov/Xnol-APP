# Part 1: Dashboard (HomeScreen) + Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and finalize HomeScreen dashboard features (income/expense buttons, balance visibility masking, account slider navigation, AllTransactionsModal) and the Analytics tooltip cursor fix per spec §2 and §4.

**Architecture:** Pure frontend changes across two feature directories. All tasks in this plan are already implemented in the current codebase — each task below is a verification with an exact expected code snapshot to diff against. If a snapshot doesn't match, the fix is given inline.

**Tech Stack:** React 18, TypeScript, Zustand, TanStack Query, Lucide icons (`Plus`, `Minus`, `Eye`, `EyeOff`), react-router-dom, Recharts

---

## File Map

| Action   | File                                                           |
|----------|----------------------------------------------------------------|
| Verify   | `frontend/src/features/home/HomeScreen.tsx`                   |
| Verify   | `frontend/src/features/transactions/AllTransactionsModal.tsx` |
| Verify   | `frontend/src/shared/components/ModalRoot.tsx`               |
| Verify   | `frontend/src/store/ui.ts`                                    |
| Verify   | `frontend/src/features/analytics/AnalyticsScreen.tsx`        |

---

## Task 1: Income/Expense Quick-Action Buttons

**Spec §2.2** — Horizontal layout (`flexDirection: 'row'`), icon size 20, `gap: 8`, `padding: '12px 0'`. No "Добавить" label.

**Files:**
- Verify: `frontend/src/features/home/HomeScreen.tsx` (income/expense button block)

- [ ] **Step 1: Confirm button layout matches spec**

Run:
```bash
grep -A 8 "openModal('add-tx', { kind: 'income'" frontend/src/features/home/HomeScreen.tsx
```
Expected output must contain `flexDirection: 'row'` and `Plus size={20}` (not 22, not column). If not, apply the fix:

```tsx
<button
  onClick={() => openModal('add-tx', { kind: 'income' })}
  style={{
    flex: 1, padding: '12px 0', borderRadius: 18,
    background: 'rgba(52,211,153,0.12)',
    border: '1px solid rgba(52,211,153,0.3)',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  }}
>
  <Plus size={20} color={COLORS.income} />
  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.income }}>Доход</span>
</button>
```

Same structure for the expense button (`Minus size={20}`, `COLORS.expense`, label "Расход").

- [ ] **Step 2: Confirm the outer container uses `gap: 12` and no flex-column wrapper**

```bash
grep -B 2 "openModal('add-tx'" frontend/src/features/home/HomeScreen.tsx | head -6
```
Expected: `display: 'flex', gap: 12` in the wrapper div.

- [ ] **Step 3: Commit (only if you made changes)**
```bash
git add frontend/src/features/home/HomeScreen.tsx
git commit -m "fix: income/expense buttons — horizontal layout, no Добавить label"
```

---

## Task 2: Balance Visibility Toggle — Full Coverage

**Spec §2.1** — When `balanceVisible === false`, render `'••••••'` in:
1. Main balance (balance card)
2. Per-account balance (account slider cards)
3. Transaction amounts (recent list AND AllTransactionsModal)

**Files:**
- Verify: `frontend/src/features/home/HomeScreen.tsx`
- Verify: `frontend/src/features/transactions/AllTransactionsModal.tsx`

- [ ] **Step 1: Verify main balance masking**

```bash
grep -A 2 "formatBigBalance(totalBalance)" frontend/src/features/home/HomeScreen.tsx
```
Expected:
```tsx
{balanceVisible ? `₽ ${formatBigBalance(totalBalance)}` : '₽ ••••••'}
```
If missing, add the ternary around the balance display.

- [ ] **Step 2: Verify account card balance masking**

```bash
grep -A 2 "balance.toLocaleString" frontend/src/features/home/HomeScreen.tsx
```
Expected:
```tsx
{balanceVisible ? `${balance.toLocaleString('ru-RU')} ${currencySymbol}` : '••••••'}
```

- [ ] **Step 3: Verify transaction amount masking in HomeScreen**

```bash
grep -A 2 "amtPrefix.*amt.*₽" frontend/src/features/home/HomeScreen.tsx
```
Expected:
```tsx
{balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
```

- [ ] **Step 4: Verify AllTransactionsModal masks amounts**

```bash
grep -A 2 "amtPrefix\|••••" frontend/src/features/transactions/AllTransactionsModal.tsx
```
Expected: same ternary pattern `{balanceVisible ? \`${amtPrefix}${amt} ₽\` : '••••••'}`.

If the modal uses a plain string without the ternary, open `AllTransactionsModal.tsx` and find the amount div:
```tsx
<div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
  {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
</div>
```

- [ ] **Step 5: Commit (only if you made changes)**
```bash
git add frontend/src/features/home/HomeScreen.tsx frontend/src/features/transactions/AllTransactionsModal.tsx
git commit -m "feat: extend balance visibility toggle to account cards, tx list, and AllTransactionsModal"
```

---

## Task 3: Account Slider — "Все →" Navigates to /accounts

**Spec §2.3** — The "Все →" button above the account slider must navigate to `/accounts`.

**Files:**
- Verify: `frontend/src/features/home/HomeScreen.tsx`

- [ ] **Step 1: Confirm `useNavigate` is imported and used**

```bash
grep -n "useNavigate\|navigate('/accounts')" frontend/src/features/home/HomeScreen.tsx
```
Expected: two lines — one import, one `const navigate = useNavigate()`, one `navigate('/accounts')` call on the accounts "Все →" button.

If missing:
```tsx
// At the top of the file, add:
import { useNavigate } from 'react-router-dom'

// Inside HomeScreen(), add:
const navigate = useNavigate()

// The accounts "Все →" button:
<button onClick={() => navigate('/accounts')} style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
  Все →
</button>
```

- [ ] **Step 2: Commit (only if you made changes)**
```bash
git add frontend/src/features/home/HomeScreen.tsx
git commit -m "feat: account slider Все → navigates to /accounts"
```

---

## Task 4: AllTransactionsModal — Store Type + Component + ModalRoot

**Spec §2.4** — "Все →" on transactions section opens `AllTransactionsModal` via `openModal('all-transactions')`.

**Files:**
- Verify: `frontend/src/store/ui.ts`
- Verify: `frontend/src/features/transactions/AllTransactionsModal.tsx`
- Verify: `frontend/src/shared/components/ModalRoot.tsx`
- Verify: `frontend/src/features/home/HomeScreen.tsx`

- [ ] **Step 1: Verify `'all-transactions'` is in ModalType**

```bash
grep "all-transactions" frontend/src/store/ui.ts
```
Expected: `'all-transactions'` present in the union type.

If missing, edit `ui.ts`:
```ts
type ModalType = 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | 'account-edit' | 'create-account' | 'create-deposit' | 'categories' | 'all-transactions' | null
```

- [ ] **Step 2: Verify AllTransactionsModal.tsx exists**

```bash
ls frontend/src/features/transactions/AllTransactionsModal.tsx
```
Expected: file exists. If not, create it with the following content:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { DynIcon } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'
import { formatDate } from '../../shared/lib/format'
import { useQuery as useCatQuery } from '@tanstack/react-query'
import { categoriesApi } from '../../api/endpoints/categories'
import type { CategoryResponse } from '../../api/types'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

export function AllTransactionsModal() {
  const { modal, closeModal, balanceVisible } = useUIStore()
  const open = modal.type === 'all-transactions'

  const { data: txList = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: transactionsApi.list,
    enabled: open,
  })

  const { data: categories = [] } = useCatQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: open,
  })

  const allCats = flatten(categories)

  function getCategoryIcon(categoryId: string): string {
    return allCats.find(c => c.id === categoryId)?.icon ?? 'Package'
  }

  function getCategoryColor(categoryId: string): string {
    return allCats.find(c => c.id === categoryId)?.color ?? '#6366f1'
  }

  function formatTxDate(isoDate: string, isoCreatedAt: string): string {
    const today = new Date()
    const txDate = new Date(isoDate)
    const time = isoCreatedAt.slice(11, 16)
    const isToday =
      txDate.getFullYear() === today.getFullYear() &&
      txDate.getMonth() === today.getMonth() &&
      txDate.getDate() === today.getDate()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const isYesterday =
      txDate.getFullYear() === yesterday.getFullYear() &&
      txDate.getMonth() === yesterday.getMonth() &&
      txDate.getDate() === yesterday.getDate()
    const label = isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)
    return `${label}, ${time}`
  }

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          Все операции
        </div>
        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: '12px 0' }}>Загрузка...</div>
        )}
        {txList.map(tx => {
          const iconName = getCategoryIcon(tx.category_id)
          const catColor = getCategoryColor(tx.category_id)
          const isIncome = tx.type === 'income'
          const amtColor = isIncome ? COLORS.income : COLORS.expense
          const amtPrefix = isIncome ? '+' : '−'
          const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')
          return (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <DynIcon name={iconName} size={18} color={catColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description || 'Операция'}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {formatTxDate(tx.date, tx.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
                {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
              </div>
            </div>
          )
        })}
        {!isLoading && txList.length === 0 && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Операций пока нет
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Verify AllTransactionsModal is registered in ModalRoot**

```bash
grep "AllTransactionsModal" frontend/src/shared/components/ModalRoot.tsx
```
Expected: both an import line and `<AllTransactionsModal />` in the JSX.

If missing, add the import and the component to `ModalRoot.tsx`:
```tsx
import { AllTransactionsModal } from '../../features/transactions/AllTransactionsModal'
// ... and in the JSX:
<AllTransactionsModal />
```

- [ ] **Step 4: Verify the transactions "Все →" button calls `openModal('all-transactions')`**

```bash
grep "all-transactions" frontend/src/features/home/HomeScreen.tsx
```
Expected: `openModal('all-transactions')` on the button in the "Последние" section header.

- [ ] **Step 5: Commit (only if you made changes)**
```bash
git add frontend/src/store/ui.ts frontend/src/features/transactions/AllTransactionsModal.tsx frontend/src/shared/components/ModalRoot.tsx frontend/src/features/home/HomeScreen.tsx
git commit -m "feat: AllTransactionsModal — all-transactions modal type, component, wired to Все btn"
```

---

## Task 5: Analytics — Fix White Overlay on Bar Chart Hover

**Spec §4.1** — `<Tooltip>` must have `cursor={{ fill: 'rgba(255,255,255,0.05)' }}` to suppress the default opaque white rectangle.

**Files:**
- Verify: `frontend/src/features/analytics/AnalyticsScreen.tsx`

- [ ] **Step 1: Verify cursor prop is present**

```bash
grep -A 4 "<Tooltip" frontend/src/features/analytics/AnalyticsScreen.tsx
```
Expected: a `cursor={{ fill: 'rgba(255,255,255,0.05)' }}` prop on the Tooltip inside the bar chart.

If missing, add it:
```tsx
<Tooltip
  contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
  formatter={(v) => typeof v === 'number' ? `${formatAmount(v)} ₽` : String(v)}
  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
/>
```

- [ ] **Step 2: Commit (only if you made changes)**
```bash
git add frontend/src/features/analytics/AnalyticsScreen.tsx
git commit -m "fix: analytics tooltip — semi-transparent cursor instead of white overlay"
```

---

## Verification

- [ ] **TypeScript — no errors:**
```bash
cd frontend && npx tsc --noEmit
```
Expected: exits 0 with no output.

- [ ] **Unit tests pass:**
```bash
cd frontend && npm test -- --run
```
Expected: all pass.
