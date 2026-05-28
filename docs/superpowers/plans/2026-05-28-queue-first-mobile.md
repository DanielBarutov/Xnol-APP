# Queue-First: Mobile — Always-Enqueue Write Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the online/offline branch from all three creation sheets. Every mutation goes to the local queue immediately; the sync hook delivers it to the server. The user sees a single green "Добавлено" toast in all cases.

**Architecture:** Six files change. `mutationQueue.ts` gains `genId()` (UUID v4) and `patchBalance()`. The three sheets drop `useNetworkStatus`, loading state, and try/catch. `useMutationSync.ts` adds an AppState foreground trigger. `AccountsScreen.tsx` shows a Clock badge for pending accounts.

**Tech Stack:** React Native (Expo SDK 56), Zustand v5, @tanstack/react-query v5, `crypto.randomUUID()` (available globally in RN 0.79+)

**Prerequisite:** The shared plan (`2026-05-28-queue-first-shared.md`) must be applied first so that `CreateAccountRequest` accepts `id?: string`.

---

## Files

| File | Change |
|---|---|
| `mobile/store/mutationQueue.ts` | Replace `genKey()` with `genId()` via `crypto.randomUUID()`; add exported `patchBalance()` |
| `mobile/features/transactions/AddTxSheet.tsx` | Queue-first; remove network/loading/try-catch; call `patchBalance` |
| `mobile/features/accounts/TransferSheet.tsx` | Queue-first; remove network/loading/try-catch; call `patchBalance` on both accounts |
| `mobile/features/accounts/CreateAccountSheet.tsx` | Queue-first; include `id` in payload; patch `['accounts']` cache with new account |
| `mobile/hooks/useMutationSync.ts` | Add `AppState` foreground trigger |
| `mobile/features/accounts/AccountsScreen.tsx` | Show Clock icon for pending (unsynced) accounts |

---

### Task 1: Update `mutationQueue.ts` — `genId` and `patchBalance`

**Files:**
- Modify: `mobile/store/mutationQueue.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { QueryClient } from '@tanstack/react-query'
import type { CreateTransactionRequest, CreateTransferRequest, CreateAccountRequest, AccountResponse } from '@xnoll/shared'

export type QueueItem =
  | { id: string; type: 'transaction'; payload: CreateTransactionRequest; queuedAt: string }
  | { id: string; type: 'transfer'; payload: CreateTransferRequest; queuedAt: string }
  | { id: string; type: 'account'; payload: CreateAccountRequest; queuedAt: string }

interface MutationQueueState {
  items: QueueItem[]
  add: (item: Omit<QueueItem, 'queuedAt'>) => void
  remove: (id: string) => void
}

export const useMutationQueue = create<MutationQueueState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set(s => ({
          items: [
            ...s.items,
            { ...item, queuedAt: new Date().toISOString() } as QueueItem,
          ],
        })),
      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    {
      name: 'xnoll-mutation-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

export function genId(): string {
  return crypto.randomUUID()
}

export function patchBalance(qc: QueryClient, accountId: string, delta: number): void {
  qc.setQueryData<AccountResponse[]>(['accounts'], (accounts = []) =>
    accounts.map(a =>
      a.id === accountId
        ? { ...a, balance: (parseFloat(a.balance) + delta).toFixed(2) }
        : a
    )
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: same pre-existing errors as baseline, no new errors.

---

### Task 2: Update `AddTxSheet.tsx` — queue-first

**Files:**
- Modify: `mobile/features/transactions/AddTxSheet.tsx`

- [ ] **Step 1: Update imports**

Replace the import block at the top (lines 1–12):

```tsx
import { forwardRef, useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import BottomSheet, { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop, BottomSheetFooter } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance } from '../../store/mutationQueue'
import { DynIcon } from '../../components/DynIcon'
import type { TransactionType, CategoryResponse } from '@xnoll/shared'
```

Changes from original:
- Removed `ActivityIndicator` from `react-native`
- Removed `transactionsApi` from `@xnoll/shared`
- Removed `useNetworkStatus` import
- Changed `genKey` → `genId`, added `patchBalance`

- [ ] **Step 2: Remove `loading` and `network` state/hook declarations**

Remove these two lines from the component body (around lines 37–38 and 49):
```tsx
const network = useNetworkStatus()
// ...
const [loading, setLoading] = useState(false)
```

- [ ] **Step 3: Replace `handleCreate` with queue-first version**

Replace the entire `handleCreate` function (lines 99–137):

```tsx
function handleCreate() {
  if (!accountId) { showToast('Выберите счёт', '#f87171'); return }

  const id = genId()
  const payload = {
    account_id: accountId,
    category_id: categoryId!,
    type,
    amount: parseFloat(amount).toFixed(2),
    date: getLocalDate(),
    description: comment || undefined,
  }

  enqueue({ id, type: 'transaction', payload })
  patchBalance(qc, accountId, type === 'income' ? parseFloat(amount) : -parseFloat(amount))
  showToast('Добавлено', '#34d399')
  reset()
  onCreated?.()
}
```

- [ ] **Step 4: Simplify `renderFooter` — remove loading branch**

In `renderFooter`, the button content currently shows `<ActivityIndicator>` when loading. Replace the inner button content:

```tsx
<>
  <Text style={[styles.nextBtnText, { color: enabled ? '#fff' : colors.textMuted }]}>{label}</Text>
  <DynIcon name={icon} size={18} color={enabled ? '#fff' : colors.textMuted} />
</>
```

Also remove `loading` from the `useCallback` dependency array:

```tsx
[step, categoryId, accountId, accent, colors, handleNext, handleCreate],
```

And remove `disabled={loading}` from the `TouchableOpacity`.

- [ ] **Step 5: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors.

---

### Task 3: Update `TransferSheet.tsx` — queue-first

**Files:**
- Modify: `mobile/features/accounts/TransferSheet.tsx`

- [ ] **Step 1: Update imports**

Replace the import block (lines 1–12):

```tsx
import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop, BottomSheetFooter } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, depositsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId, patchBalance } from '../../store/mutationQueue'
import type { SourceDestType } from '@xnoll/shared'
```

Changes: removed `transfersApi`, `ActivityIndicator`, `useNetworkStatus`; changed `genKey` → `genId`, added `patchBalance`.

- [ ] **Step 2: Remove `loading` and `network` declarations**

Remove from component body:
```tsx
const network = useNetworkStatus()
// ...
const [loading, setLoading] = useState(false)
```

- [ ] **Step 3: Replace `handleCreate` with queue-first version**

Replace the entire `handleCreate` function (lines 59–93):

```tsx
function handleCreate() {
  if (!fromId || !toId || !amount) { showToast('Заполните все поля', '#f87171'); return }

  const id = genId()
  const payload = {
    source_type: fromKind as SourceDestType,
    source_id: fromId,
    dest_type: toKind as SourceDestType,
    dest_id: toId,
    amount: parseFloat(amount.replace(',', '.')).toFixed(2),
    currency: 'RUB' as const,
    date: todayISO(),
  }

  enqueue({ id, type: 'transfer', payload })
  const delta = parseFloat(amount.replace(',', '.'))
  patchBalance(qc, fromId, -delta)
  patchBalance(qc, toId, +delta)
  showToast('Добавлено', '#34d399')
  reset()
  onCreated()
}
```

Note: `patchBalance` only patches the `['accounts']` query. Transfers involving deposits won't get an optimistic balance update (deposits are a separate query key) — that's acceptable per the spec.

- [ ] **Step 4: Simplify `renderFooter` — remove loading branch**

In `renderFooter`, replace the second button (Перевести) with:

```tsx
<TouchableOpacity
  style={[styles.footerBtn, { backgroundColor: amount ? accent : colors.surface2 }]}
  onPress={handleCreate}
>
  <Text style={[styles.footerBtnText, { color: amount ? '#fff' : colors.textMuted }]}>Перевести</Text>
</TouchableOpacity>
```

Remove `loading` from the `useCallback` dependency array for `renderFooter`:

```tsx
[step, canNext, amount, accent, colors],
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors.

---

### Task 4: Update `CreateAccountSheet.tsx` — queue-first with cache patch

**Files:**
- Modify: `mobile/features/accounts/CreateAccountSheet.tsx`

- [ ] **Step 1: Update imports**

Replace the import block (lines 1–12):

```tsx
import { forwardRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native'
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { useMutationQueue, genId } from '../../store/mutationQueue'
import type { Currency, AccountResponse } from '@xnoll/shared'
```

Changes: removed `accountsApi`, `ActivityIndicator`, `useNetworkStatus`; added `useQueryClient`, `AccountResponse`; changed `genKey` → `genId`.

- [ ] **Step 2: Add `qc` to the component and remove `loading`/`network`**

Replace the hook declarations at the top of the component body. Remove `network` and `loading`, add `qc`:

```tsx
const colors = useTheme()
const showToast = useUIStore(s => s.showToast)
const qc = useQueryClient()
const enqueue = useMutationQueue(s => s.add)
const accent = colors.expense
```

- [ ] **Step 3: Replace `handleCreate` with queue-first + cache patch**

Replace the entire `handleCreate` function (lines 36–57):

```tsx
function handleCreate() {
  if (!name) { showToast('Введите название', '#f87171'); return }

  const id = genId()
  const payload = { id, name, bank_name: bank, currency, balance }

  enqueue({ id, type: 'account', payload })
  qc.setQueryData<AccountResponse[]>(['accounts'], (accounts = []) => [
    ...accounts,
    {
      id,
      name,
      bank_name: bank || '',
      currency,
      balance,
      created_at: new Date().toISOString(),
      user_id: '',
    },
  ])
  showToast('Добавлено', '#34d399')
  reset()
  onCreated()
}
```

The `user_id: ''` is a placeholder — it will be corrected when the sync hook calls `invalidateQueries(['accounts'])` and the real server response comes back.

- [ ] **Step 4: Simplify the submit button — remove loading branch**

Replace the button at the bottom of the form:

```tsx
<TouchableOpacity style={[styles.btn, { backgroundColor: name ? accent : colors.surface2 }]} onPress={handleCreate}>
  <Text style={[styles.btnText, { color: name ? '#fff' : colors.textMuted }]}>Создать счёт</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors.

---

### Task 5: Update `useMutationSync.ts` — AppState foreground trigger

**Files:**
- Modify: `mobile/hooks/useMutationSync.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, transfersApi, accountsApi } from '@xnoll/shared'
import { useMutationQueue } from '../store/mutationQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { useUIStore } from '../store/ui'

export function useMutationSync() {
  const qc = useQueryClient()
  const network = useNetworkStatus()
  const processing = useRef(false)
  const showToast = useUIStore.getState().showToast

  async function processQueue() {
    if (processing.current) return
    const { items, remove } = useMutationQueue.getState()
    if (items.length === 0) return

    processing.current = true
    let processed = 0

    for (const item of [...items]) {
      try {
        if (item.type === 'transaction') {
          await transactionsApi.create(item.payload, item.id)
        } else if (item.type === 'transfer') {
          await transfersApi.create(item.payload, item.id)
        } else if (item.type === 'account') {
          await accountsApi.create(item.payload, item.id)
        }
        remove(item.id)
        processed++
      } catch {
        // Stop on first failure — retry next time network comes back
        break
      }
    }

    if (processed > 0) {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      showToast(`Отправлено ${processed} операций из очереди`, '#34d399')
    }

    processing.current = false
  }

  useEffect(() => {
    if (network === 'online') processQueue()
  }, [network])

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && network === 'online') processQueue()
    })
    return () => sub.remove()
  }, [network])
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors.

---

### Task 6: Update `AccountsScreen.tsx` — Clock badge for pending accounts

**Files:**
- Modify: `mobile/features/accounts/AccountsScreen.tsx`

- [ ] **Step 1: Add `useMutationQueue` import**

In `AccountsScreen.tsx`, after the existing imports, add:

```tsx
import { useMutationQueue } from '../../store/mutationQueue'
```

- [ ] **Step 2: Subscribe to queue items inside the component**

Add after the `useQueryClient()` call at the top of `AccountsScreen`:

```tsx
const queueItems = useMutationQueue(s => s.items)
```

- [ ] **Step 3: Show Clock badge for pending accounts**

In the `accounts.map(...)` render loop, find the `rowInfo` View block:

```tsx
<View style={styles.rowInfo}>
  <Text style={[styles.rowName, { color: colors.textPrimary }]}>{acc.bank_name ?? acc.name}</Text>
  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{acc.name}</Text>
</View>
```

Replace with:

```tsx
<View style={styles.rowInfo}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Text style={[styles.rowName, { color: colors.textPrimary }]}>{acc.bank_name ?? acc.name}</Text>
    {queueItems.some(i => i.type === 'account' && i.id === acc.id) && (
      <DynIcon name="Clock" size={14} color={colors.textMuted} />
    )}
  </View>
  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{acc.name}</Text>
</View>
```

(`DynIcon` is already imported in this file.)

- [ ] **Step 4: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors.

---

### Task 7: Final commit

- [ ] **Step 1: Run full TypeScript check one more time**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: only the 3 pre-existing Expo Router path errors, nothing new.

- [ ] **Step 2: Commit all mobile changes**

```bash
git add mobile/store/mutationQueue.ts \
        mobile/features/transactions/AddTxSheet.tsx \
        mobile/features/accounts/TransferSheet.tsx \
        mobile/features/accounts/CreateAccountSheet.tsx \
        mobile/hooks/useMutationSync.ts \
        mobile/features/accounts/AccountsScreen.tsx
git commit -m "feat(mobile): queue-first write flow with optimistic balance updates"
```
