# Part 2: Accounts & Transfers + Categories CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and finalize AccountEditModal (edit/delete account), TransferModal same-account guard, "Далее ›" Unicode chevron, Category CRUD (edit/delete + parent_id picker) per spec §3 and §5.

**Architecture:** Pure frontend. All tasks in this plan are already implemented in the current codebase — each task is a verification with the expected code snapshot. If a snapshot doesn't match, the fix is given inline.

**Tech Stack:** React 18, TypeScript, Zustand, TanStack Query, Lucide icons (`Edit`, `Trash2`), react-router-dom

---

## File Map

| Action   | File                                                              |
|----------|-------------------------------------------------------------------|
| Verify   | `frontend/src/store/ui.ts`                                       |
| Verify   | `frontend/src/api/endpoints/categories.ts`                       |
| Verify   | `frontend/src/api/types.ts`                                      |
| Verify   | `frontend/src/features/accounts/TransferModal.tsx`               |
| Verify   | `frontend/src/features/accounts/AccountEditModal.tsx`            |
| Verify   | `frontend/src/features/accounts/AccountsScreen.tsx`              |
| Verify   | `frontend/src/shared/components/ModalRoot.tsx`                   |
| Verify   | `frontend/src/features/categories/CategoryManageModal.tsx`       |

---

## Task 1: UIStore Has `account-edit` and `all-transactions` Modal Types

**Spec §3.1** — Clicking an account row opens `AccountEditModal` via `openModal('account-edit', { accountId })`.

**Files:**
- Verify: `frontend/src/store/ui.ts`

- [ ] **Step 1: Check ModalType union**

```bash
grep "ModalType" frontend/src/store/ui.ts
```
Expected:
```ts
type ModalType = 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | 'account-edit' | 'create-account' | 'create-deposit' | 'categories' | 'all-transactions' | null
```
Both `'account-edit'` and `'all-transactions'` must be present.

If either is missing, add it to the union. Then:

- [ ] **Step 2: Commit (only if you made changes)**
```bash
git add frontend/src/store/ui.ts
git commit -m "feat: add account-edit and all-transactions modal types to UIStore"
```

---

## Task 2: categoriesApi Has `update` and `delete`

**Spec §5.1** — Category edit/delete calls `categoriesApi.update(id, { name, icon, color })` and `categoriesApi.delete(id)`.

**Files:**
- Verify: `frontend/src/api/endpoints/categories.ts`
- Verify: `frontend/src/api/types.ts`

- [ ] **Step 1: Check `UpdateCategoryRequest` type exists**

```bash
grep "UpdateCategoryRequest" frontend/src/api/types.ts
```
Expected:
```ts
export interface UpdateCategoryRequest { name?: string; icon?: string; color?: string }
```
If missing, add it after `CreateCategoryRequest`.

- [ ] **Step 2: Check `categoriesApi` has `update` and `delete`**

```bash
grep "update\|delete" frontend/src/api/endpoints/categories.ts
```
Expected: two lines — one with `update:` calling `api.put`, one with `delete:` calling `api.delete`.

If missing, replace the full file:
```ts
import { api } from '../client'
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../types'

export const categoriesApi = {
  list: () => api.get<CategoryResponse[]>('/api/v1/categories').then(r => r.data),
  create: (data: CreateCategoryRequest) => api.post<CategoryResponse>('/api/v1/categories', data).then(r => r.data),
  update: (id: string, data: UpdateCategoryRequest) => api.put<CategoryResponse>(`/api/v1/categories/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/categories/${id}`),
}
```

- [ ] **Step 3: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit (only if you made changes)**
```bash
git add frontend/src/api/endpoints/categories.ts frontend/src/api/types.ts
git commit -m "feat: add update/delete to categoriesApi and UpdateCategoryRequest type"
```

---

## Task 3: TransferModal — Same-Account Guard + "Далее ›" Chevron

**Spec §3.3** — When `sourceType === destType`, exclude the source account from the destination list.  
**Spec §3.4** — Button text must be `Далее ›` (Unicode U+203A), not a Lucide icon or `>`.

**Files:**
- Verify: `frontend/src/features/accounts/TransferModal.tsx`

- [ ] **Step 1: Verify same-account filter is applied**

```bash
grep -A 4 "rawDestItems\|destItems" frontend/src/features/accounts/TransferModal.tsx
```
Expected:
```ts
const rawDestItems = destType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])
const destItems = sourceType === destType
  ? rawDestItems.filter(item => item.id !== sourceId)
  : rawDestItems
```

If the code reads `const destItems = destType === ...` without the filter, replace with:
```ts
const rawDestItems = destType === 'savings_account' ? (accounts.data ?? []) : (deposits.data ?? [])
const destItems = sourceType === destType
  ? rawDestItems.filter(item => item.id !== sourceId)
  : rawDestItems
```

- [ ] **Step 2: Verify "Далее ›" uses Unicode chevron**

```bash
grep "Далее" frontend/src/features/accounts/TransferModal.tsx
```
Expected: `Далее ›` — the `›` character (U+203A), no JSX component inside the button text.

If it uses `Icons.chev(14)` or similar, replace with:
```tsx
Далее ›
```

- [ ] **Step 3: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit (only if you made changes)**
```bash
git add frontend/src/features/accounts/TransferModal.tsx
git commit -m "fix: transfer modal — filter same-account in dest list, Далее › Unicode chevron"
```

---

## Task 4: AccountEditModal Component

**Spec §3.2** — Modal pre-filled with `bank_name` and `name` via `useEffect([account])`. Save calls `accountsApi.update`. Delete calls `window.confirm` + `accountsApi.delete`. Save disabled when either field is empty. Loading states on both buttons.

**Files:**
- Verify: `frontend/src/features/accounts/AccountEditModal.tsx`

- [ ] **Step 1: Verify file exists and has the correct structure**

```bash
ls frontend/src/features/accounts/AccountEditModal.tsx && grep -n "saveMutation\|deleteMutation\|canSave" frontend/src/features/accounts/AccountEditModal.tsx
```
Expected: file exists, lines for `saveMutation`, `deleteMutation`, `canSave`.

If the file is missing, create it:
```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { accountsApi } from '../../api/endpoints/accounts'
import { useAccounts } from './hooks/useAccounts'
import { COLORS } from '../../shared/tokens'

export function AccountEditModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'account-edit'
  const accountId = (modal.payload as { accountId: string } | undefined)?.accountId ?? ''
  const qc = useQueryClient()
  const { accounts } = useAccounts()
  const account = accounts.data?.find(a => a.id === accountId)

  const [bankName, setBankName] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (account) {
      setBankName(account.bank_name)
      setName(account.name)
    }
  }, [account])

  const saveMutation = useMutation({
    mutationFn: () => accountsApi.update(accountId, { bank_name: bankName, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      showToast('Счёт обновлён', COLORS.income)
      closeModal()
    },
    onError: () => showToast('Ошибка при сохранении', COLORS.expense),
  })

  const deleteMutation = useMutation({
    mutationFn: () => accountsApi.delete(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      showToast('Счёт удалён', COLORS.expense)
      closeModal()
    },
    onError: () => showToast('Ошибка при удалении', COLORS.expense),
  })

  const handleDelete = () => {
    if (window.confirm('Удалить счёт? Это действие нельзя отменить.')) {
      deleteMutation.mutate()
    }
  }

  const canSave = bankName.trim() && name.trim()

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>
          Редактировать счёт
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Банк</div>
          <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Сбербанк" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Название</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Основной" style={inputStyle} />
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          style={{
            width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700,
            background: canSave ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
            color: canSave ? '#fff' : COLORS.textSecondary,
            border: 0, cursor: canSave ? 'pointer' : 'default', marginBottom: 10,
          }}
        >
          {saveMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          style={{
            width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700,
            background: `${COLORS.expense}18`, color: COLORS.expense,
            border: `1px solid ${COLORS.expense}44`, cursor: 'pointer',
          }}
        >
          {deleteMutation.isPending ? 'Удаляем...' : 'Удалить счёт'}
        </button>
      </div>
    </Modal>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: COLORS.textSecondary, fontWeight: 600,
  letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 14,
  background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
  color: COLORS.textPrimary, fontSize: 15, fontWeight: 500,
  outline: 'none', boxSizing: 'border-box',
}
```

- [ ] **Step 2: Commit (only if you made changes)**
```bash
git add frontend/src/features/accounts/AccountEditModal.tsx
git commit -m "feat: AccountEditModal — edit bank_name/name, delete account with confirm guard"
```

---

## Task 5: AccountsScreen + ModalRoot Wire-Up

**Spec §3.1** — Account row click opens `AccountEditModal`. `AccountEditModal` must be in `ModalRoot`.

**Files:**
- Verify: `frontend/src/features/accounts/AccountsScreen.tsx`
- Verify: `frontend/src/shared/components/ModalRoot.tsx`

- [ ] **Step 1: Verify AccountsScreen opens `account-edit` modal**

```bash
grep "account-edit" frontend/src/features/accounts/AccountsScreen.tsx
```
Expected: `openModal('account-edit', { accountId: a.id })` on the account row button.

If it opens `'account-detail'` instead, change it:
```tsx
onClick={() => openModal('account-edit', { accountId: a.id })}
```

- [ ] **Step 2: Verify AccountEditModal is in ModalRoot**

```bash
grep "AccountEditModal" frontend/src/shared/components/ModalRoot.tsx
```
Expected: one import line and one `<AccountEditModal />` in the JSX.

If missing, add both:
```tsx
import { AccountEditModal } from '../../features/accounts/AccountEditModal'
// ...
<AccountEditModal />
```

- [ ] **Step 3: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit (only if you made changes)**
```bash
git add frontend/src/features/accounts/AccountsScreen.tsx frontend/src/shared/components/ModalRoot.tsx
git commit -m "feat: AccountsScreen row → account-edit modal; AccountEditModal registered in ModalRoot"
```

---

## Task 6: Category CRUD — Edit/Delete Buttons in List View

**Spec §5.1** — Non-system categories show `Edit` (icon size 15, `COLORS.textSecondary`) and `Trash2` (size 15, `COLORS.expense`) icon buttons. Clicking Edit switches to pre-filled editing form. Clicking Trash2 calls `window.confirm` then `categoriesApi.delete`.

**Files:**
- Verify: `frontend/src/features/categories/CategoryManageModal.tsx`

- [ ] **Step 1: Verify `Edit` and `Trash2` are imported from `lucide-react`**

```bash
grep "import.*Edit.*Trash2\|import.*Trash2.*Edit" frontend/src/features/categories/CategoryManageModal.tsx
```
Expected: `import { Edit, Trash2 } from 'lucide-react'`

If missing, add the import.

- [ ] **Step 2: Verify edit/delete buttons are rendered for non-system categories**

```bash
grep -A 5 "is_system" frontend/src/features/categories/CategoryManageModal.tsx | head -20
```
Expected: `{cat.is_system ? <span ...>системная</span> : <div ...><Edit .../><Trash2 .../></div>}`

If only a label is shown with no buttons, replace the row tail with:
```tsx
{cat.is_system ? (
  <span style={{ fontSize: 11, color: COLORS.textMuted }}>системная</span>
) : (
  <div style={{ display: 'flex', gap: 4 }}>
    <button
      onClick={() => {
        setEditing(cat.id)
        setEditName(cat.name)
        setEditIcon(cat.icon)
        setEditColor(cat.color)
      }}
      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.textSecondary }}
    >
      <Edit size={15} />
    </button>
    <button
      onClick={() => {
        if (window.confirm(`Удалить категорию «${cat.name}»?`)) {
          deleteMutation.mutate(cat.id)
        }
      }}
      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.expense }}
    >
      <Trash2 size={15} />
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify `editing` state and `updateMutation` / `deleteMutation` are declared**

```bash
grep -n "editing\|updateMutation\|deleteMutation" frontend/src/features/categories/CategoryManageModal.tsx | head -10
```
Expected: state `editing: string | null`, plus both mutations. If missing, add after the existing `mutation`:
```tsx
const [editing, setEditing] = useState<string | null>(null)
const [editName, setEditName] = useState('')
const [editIcon, setEditIcon] = useState('Package')
const [editColor, setEditColor] = useState('#6366f1')

const updateMutation = useMutation({
  mutationFn: () => categoriesApi.update(editing!, { name: editName, icon: editIcon, color: editColor }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['categories'] })
    showToast('Категория обновлена', COLORS.income)
    setEditing(null)
  },
  onError: () => showToast('Ошибка', COLORS.expense),
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => categoriesApi.delete(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['categories'] })
    showToast('Категория удалена', COLORS.expense)
  },
  onError: () => showToast('Ошибка при удалении', COLORS.expense),
})
```

- [ ] **Step 4: Verify modal header shows editing branch**

```bash
grep -A 5 "editing || creating\|editing ? " frontend/src/features/categories/CategoryManageModal.tsx | head -15
```
Expected: the header renders "Изменить категорию" when `editing !== null` and a back button that calls `setCreating(false); setEditing(null)`.

- [ ] **Step 5: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Commit (only if you made changes)**
```bash
git add frontend/src/features/categories/CategoryManageModal.tsx
git commit -m "feat: category CRUD — edit/delete buttons, editing form, back button"
```

---

## Task 7: Category Hierarchy — parent_id Selector in Create Form

**Spec §5.2** — In the Create form, above the Name input, show a `<select>` listing root-level categories of the current tab. First option "Без родительской" (value=""). Mutation includes `parent_id: parentId || undefined`. Resets `parentId` to `''` on success.

**Files:**
- Verify: `frontend/src/features/categories/CategoryManageModal.tsx`

- [ ] **Step 1: Verify `parentId` state exists**

```bash
grep "parentId" frontend/src/features/categories/CategoryManageModal.tsx | head -5
```
Expected: `const [parentId, setParentId] = useState<string>('')`

- [ ] **Step 2: Verify `parentOptions` is computed**

```bash
grep "parentOptions" frontend/src/features/categories/CategoryManageModal.tsx
```
Expected:
```ts
const parentOptions = categories?.filter(c => c.type === tab && !c.parent_id) ?? []
```

- [ ] **Step 3: Verify the select is in the create form JSX**

```bash
grep -A 5 "parentOptions.length > 0\|Без родительской" frontend/src/features/categories/CategoryManageModal.tsx | head -10
```
Expected: a `<select>` rendered when `parentOptions.length > 0`, with first option "Без родительской".

If missing, add before the Name input div in the `creating` branch:
```tsx
{parentOptions.length > 0 && (
  <div style={{ marginBottom: 16 }}>
    <div style={labelStyle}>Родительская категория</div>
    <select
      value={parentId}
      onChange={e => setParentId(e.target.value)}
      style={{ ...inputStyle, appearance: 'none' }}
    >
      <option value="">Без родительской</option>
      {parentOptions.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 4: Verify `parent_id` is passed in the create mutation**

```bash
grep "parent_id\|parentId" frontend/src/features/categories/CategoryManageModal.tsx | grep "mutationFn\|create("
```
Expected: `categoriesApi.create({ name, type: tab, icon, color, parent_id: parentId || undefined })`

- [ ] **Step 5: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Commit (only if you made changes)**
```bash
git add frontend/src/features/categories/CategoryManageModal.tsx
git commit -m "feat: parent_id selector in category create form"
```

---

## Verification

- [ ] **Full TypeScript check:**
```bash
cd frontend && npx tsc --noEmit
```
Expected: exits 0.

- [ ] **Unit tests pass:**
```bash
cd frontend && npm test -- --run
```
Expected: all pass.
