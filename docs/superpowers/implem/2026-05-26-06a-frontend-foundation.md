# XNoll Frontend — Plan 06a: Foundation + Auth + App Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Vite + React + TS project, wire up the API client with JWT auth, implement login/register screens, and build the shared App shell (BottomNav, Modal, Toast, DevFrame).

**Architecture:** Feature-modules layout under `frontend/src/`. `api/client.ts` is an axios instance with a request interceptor (Bearer token) and a response interceptor (401 → refresh → retry). Auth state lives in Zustand (`store/auth.ts`). All other UI state (modal, toast, theme) lives in `store/ui.ts`. React Router v6 handles navigation; a `<ProtectedRoute>` wrapper redirects unauthenticated users to `/login`.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, TanStack Query 5, Zustand 4, React Router 6, axios, Vitest + React Testing Library.

---

## File Map

**New files (this plan):**
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/tsconfig.json`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/shared/tokens.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/api/endpoints/auth.ts`
- `frontend/src/store/auth.ts`
- `frontend/src/store/ui.ts`
- `frontend/src/shared/components/Modal.tsx`
- `frontend/src/shared/components/Toast.tsx`
- `frontend/src/shared/components/BottomNav.tsx`
- `frontend/src/shared/components/DevFrame.tsx`
- `frontend/src/shared/components/ProtectedRoute.tsx`
- `frontend/src/shared/lib/format.ts`
- `frontend/src/features/auth/LoginScreen.tsx`
- `frontend/src/features/auth/RegisterScreen.tsx`
- `frontend/src/shared/lib/format.test.ts`
- `frontend/src/store/auth.test.ts`

---

### Task 1: Scaffold Vite project

**Files:**
- Create: `frontend/` (all config files)

- [ ] **Step 1: Create project**

```bash
cd /home/daniel/xnoll
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom @tanstack/react-query zustand axios
npm install recharts
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create `frontend/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Configure `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-3': 'var(--accent-3)',
      },
      fontFamily: {
        sans: ['-apple-system', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 6: Replace `frontend/index.html` body**

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>XNoll</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `.env.example`**

```
VITE_API_URL=http://localhost:8000
VITE_DEV_FRAME=true
```

- [ ] **Step 8: Verify it runs**

```bash
npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173`.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Vite + React + TS + Tailwind frontend"
```

---

### Task 2: Design tokens + global styles

**Files:**
- Create: `frontend/src/shared/tokens.ts`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write `frontend/src/shared/tokens.ts`**

```ts
export type ThemeName = 'violet' | 'teal' | 'amber' | 'rose'

export interface Theme {
  name: string
  accent: string
  accent2: string
  accent3: string
  glow: string
  shadow: string
  swatches: [string, string, string]
}

export const THEMES: Record<ThemeName, Theme> = {
  violet: {
    name: 'Violet',
    swatches: ['#6366f1', '#8b5cf6', '#a855f7'],
    accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7',
    glow: 'rgba(99,102,241,0.20)', shadow: 'rgba(99,102,241,0.45)',
  },
  teal: {
    name: 'Teal',
    swatches: ['#0f766e', '#14b8a6', '#06b6d4'],
    accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4',
    glow: 'rgba(20,184,166,0.18)', shadow: 'rgba(20,184,166,0.45)',
  },
  amber: {
    name: 'Amber',
    swatches: ['#f59e0b', '#f97316', '#fbbf24'],
    accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24',
    glow: 'rgba(245,158,11,0.18)', shadow: 'rgba(245,158,11,0.45)',
  },
  rose: {
    name: 'Rose',
    swatches: ['#e11d48', '#ec4899', '#f43f5e'],
    accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e',
    glow: 'rgba(236,72,153,0.18)', shadow: 'rgba(236,72,153,0.45)',
  },
}

export const COLORS = {
  bg: '#04060d',
  surface: '#0a0e1a',
  surface2: '#131826',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  textPrimary: '#e6e9f2',
  textSecondary: '#6c7488',
  textMuted: '#3e455a',
  income: '#34d399',
  expense: '#f87171',
}
```

- [ ] **Step 2: Replace `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #6366f1;
  --accent-2: #8b5cf6;
  --accent-3: #a855f7;
  --accent-glow: rgba(99,102,241,0.20);
  --accent-shadow: rgba(99,102,241,0.45);
  --accent-tint: rgba(99,102,241,0.12);
}

html, body, #root {
  margin: 0; padding: 0;
  background: #04060d;
  color: #e6e9f2;
  font-family: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { display: none; }

@keyframes xn-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes xn-slide { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes xn-toast { from { opacity: 0; transform: translate(-50%, 10px) } to { opacity: 1; transform: translate(-50%, 0) } }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/tokens.ts frontend/src/index.css
git commit -m "feat: design tokens and global CSS vars"
```

---

### Task 3: Shared utility functions (TDD)

**Files:**
- Create: `frontend/src/shared/lib/format.ts`
- Create: `frontend/src/shared/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// frontend/src/shared/lib/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatAmount, formatCurrency, formatDate, categoryEmoji } from './format'

describe('formatAmount', () => {
  it('formats integer with RU locale', () => {
    expect(formatAmount(85000)).toBe('85 000')
  })
  it('formats decimal', () => {
    expect(formatAmount(1200.5)).toBe('1 200,5')
  })
})

describe('formatCurrency', () => {
  it('appends ₽ for RUB', () => expect(formatCurrency(1000, 'RUB')).toBe('1 000 ₽'))
  it('appends $ for USD', () => expect(formatCurrency(500, 'USD')).toBe('500 $'))
  it('appends € for EUR', () => expect(formatCurrency(200, 'EUR')).toBe('200 €'))
})

describe('formatDate', () => {
  it('returns Сегодня for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(formatDate(today)).toBe('Сегодня')
  })
  it('formats other dates', () => {
    expect(formatDate('2026-05-20')).toMatch(/20 мая/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/shared/lib/format.test.ts
```

Expected: FAIL — `format.ts` not found.

- [ ] **Step 3: Implement `format.ts`**

```ts
// frontend/src/shared/lib/format.ts
const SYM: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }

export function formatAmount(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

export function formatCurrency(n: number, currency: string): string {
  return `${formatAmount(n)} ${SYM[currency] ?? currency}`
}

export function formatDate(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (isoDate === today) return 'Сегодня'
  if (isoDate === yesterday) return 'Вчера'
  return new Date(isoDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function categoryEmoji(name: string): string {
  const map: Record<string, string> = {
    зарплата: '💼', фриланс: '💻', перевод: '↔️',
    продукты: '🛒', кафе: '☕', такси: '🚕', аренда: '🏠',
    развлечения: '🎬', здоровье: '💊', другое: '📦',
  }
  return map[name.toLowerCase()] ?? '📦'
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/shared/lib/format.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/lib/
git commit -m "feat: format utilities with tests"
```

---

### Task 4: API client + types

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/types.ts`

- [ ] **Step 1: Write `frontend/src/api/types.ts`**

```ts
export type Currency = 'RUB' | 'USD' | 'EUR'
export type TransactionType = 'income' | 'expense'
export type StatPeriod = 'this_month' | 'prev_month' | 'this_year'

// Auth
export interface TokenResponse { access_token: string; refresh_token: string }
export interface UserResponse { id: string; email: string; full_name: string; primary_currency: Currency; is_active: boolean }
export interface RegisterRequest { email: string; password: string; full_name: string; primary_currency: Currency }
export interface LoginRequest { email: string; password: string }

// Categories
export interface CategoryResponse { id: string; user_id: string | null; parent_id: string | null; name: string; type: string; icon: string; color: string; is_system: boolean; children: CategoryResponse[] }
export interface CreateCategoryRequest { name: string; type: string; icon: string; color: string; parent_id?: string }

// Accounts
export interface AccountResponse { id: string; user_id: string; name: string; bank_name: string; balance: string; currency: Currency; created_at: string }
export interface CreateAccountRequest { name: string; bank_name: string; currency: Currency; balance: string }

// Deposits
export interface DepositResponse { id: string; user_id: string; name: string; bank_name: string; amount: string; interest_rate: string; interest_type: 'simple' | 'compound'; open_date: string; close_date: string; currency: Currency; auto_renew: boolean; early_closure_rate: string | null; balance: string; status: string; created_at: string }
export interface CreateDepositRequest { name: string; bank_name: string; amount: string; interest_rate: string; interest_type: 'simple' | 'compound'; open_date: string; close_date: string; currency: Currency; auto_renew: boolean; early_closure_rate?: string }

// Transactions
export interface TransactionResponse { id: string; user_id: string; account_id: string; category_id: string; type: TransactionType; amount: string; date: string; description: string | null; created_at: string }
export interface CreateTransactionRequest { account_id: string; category_id: string; type: TransactionType; amount: string; date: string; description?: string }

// Transfers
export type SourceDestType = 'savings_account' | 'deposit' | 'external'
export interface TransferResponse { id: string; user_id: string; source_type: SourceDestType; source_id: string | null; source_label: string | null; dest_type: SourceDestType; dest_id: string | null; dest_label: string | null; amount: string; currency: Currency; date: string; description: string | null; created_at: string }
export interface CreateTransferRequest { source_type: SourceDestType; source_id?: string; source_label?: string; dest_type: SourceDestType; dest_id?: string; dest_label?: string; amount: string; currency: Currency; date: string; description?: string }

// Stats
export interface CategoryStatResponse { category_id: string; category_name: string; amount: string }
export interface CategoryStatsResponse { date_from: string; date_to: string; total_income: string; total_expense: string; net: string; income_by_category: CategoryStatResponse[]; expense_by_category: CategoryStatResponse[] }
export interface TimelinePeriodResponse { period: string; income: string; expense: string; net: string }
export interface TimelineResponse { date_from: string; date_to: string; granularity: 'month' | 'day'; periods: TimelinePeriodResponse[] }
export interface AccountStatResponse { account_id: string; account_name: string; income: string; expense: string; net: string }
export interface AccountStatsResponse { date_from: string; date_to: string; accounts: AccountStatResponse[] }
```

- [ ] **Step 2: Write `frontend/src/api/client.ts`**

```ts
import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        const rt = useAuthStore.getState().refreshToken
        if (!rt) {
          useAuthStore.getState().logout()
          return Promise.reject(error)
        }
        refreshing = axios
          .post(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/v1/auth/refresh`, { refresh_token: rt })
          .then((res) => {
            const { access_token, refresh_token } = res.data
            useAuthStore.getState().setTokens(access_token, refresh_token)
            return access_token
          })
          .catch(() => {
            useAuthStore.getState().logout()
            throw error
          })
          .finally(() => { refreshing = null })
      }
      const newToken = await refreshing
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    }
    return Promise.reject(error)
  },
)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: API client with JWT request/refresh interceptors"
```

---

### Task 5: Auth store + API endpoints

**Files:**
- Create: `frontend/src/store/auth.ts`
- Create: `frontend/src/api/endpoints/auth.ts`
- Create: `frontend/src/store/auth.test.ts`

- [ ] **Step 1: Write `frontend/src/store/auth.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserResponse } from '../api/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserResponse | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: UserResponse) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'xnoll-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }) },
  ),
)
```

- [ ] **Step 2: Write `frontend/src/api/endpoints/auth.ts`**

```ts
import { api } from '../client'
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from '../types'

export const authApi = {
  login: (data: LoginRequest) => api.post<TokenResponse>('/api/v1/auth/login', data).then(r => r.data),
  register: (data: RegisterRequest) => api.post<UserResponse>('/api/v1/auth/register', data).then(r => r.data),
  me: () => api.get<UserResponse>('/api/v1/auth/me').then(r => r.data),
  refresh: (refresh_token: string) => api.post<TokenResponse>('/api/v1/auth/refresh', { refresh_token }).then(r => r.data),
}
```

- [ ] **Step 3: Write `frontend/src/store/auth.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth'

beforeEach(() => useAuthStore.setState({ accessToken: null, refreshToken: null, user: null }))

describe('auth store', () => {
  it('setTokens stores both tokens', () => {
    useAuthStore.getState().setTokens('acc', 'ref')
    expect(useAuthStore.getState().accessToken).toBe('acc')
    expect(useAuthStore.getState().refreshToken).toBe('ref')
  })

  it('logout clears all auth state', () => {
    useAuthStore.getState().setTokens('acc', 'ref')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })
})
```

- [ ] **Step 4: Run auth store tests**

```bash
cd frontend && npx vitest run src/store/auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/ frontend/src/api/endpoints/auth.ts
git commit -m "feat: auth store (Zustand persist) + auth API endpoints"
```

---

### Task 6: UI store

**Files:**
- Create: `frontend/src/store/ui.ts`

- [ ] **Step 1: Write `frontend/src/store/ui.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeName } from '../shared/tokens'

type ModalType = 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | null

interface UIState {
  modal: { type: ModalType; payload?: unknown }
  toast: { message: string; color: string } | null
  theme: ThemeName
  balanceVisible: boolean
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  showToast: (message: string, color: string) => void
  dismissToast: () => void
  setTheme: (theme: ThemeName) => void
  toggleBalance: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modal: { type: null },
      toast: null,
      theme: 'violet',
      balanceVisible: true,
      openModal: (type, payload) => set({ modal: { type, payload } }),
      closeModal: () => set({ modal: { type: null } }),
      showToast: (message, color) => set({ toast: { message, color } }),
      dismissToast: () => set({ toast: null }),
      setTheme: (theme) => set({ theme }),
      toggleBalance: () => set((s) => ({ balanceVisible: !s.balanceVisible })),
    }),
    { name: 'xnoll-ui', partialize: (s) => ({ theme: s.theme, balanceVisible: s.balanceVisible }) },
  ),
)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/ui.ts
git commit -m "feat: UI store (modal, toast, theme, balanceVisible)"
```

---

### Task 7: Shared components — Modal, Toast, ProtectedRoute

**Files:**
- Create: `frontend/src/shared/components/Modal.tsx`
- Create: `frontend/src/shared/components/Toast.tsx`
- Create: `frontend/src/shared/components/ProtectedRoute.tsx`

- [ ] **Step 1: Write `Modal.tsx`**

```tsx
// frontend/src/shared/components/Modal.tsx
import { useEffect } from 'react'
import { COLORS } from '../tokens'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, onClose, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2,4,12,0.65)',
          backdropFilter: 'blur(8px)',
          animation: 'xn-fade 0.18s ease-out',
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
        background: `linear-gradient(to bottom, ${COLORS.surface2}, ${COLORS.surface})`,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: `1px solid ${COLORS.borderStrong}`,
        borderBottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        animation: 'xn-slide 0.22s cubic-bezier(.2,.9,.3,1)',
        maxHeight: '92dvh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 42, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }} />
        </div>
        {children}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Write `Toast.tsx`**

```tsx
// frontend/src/shared/components/Toast.tsx
import { useEffect } from 'react'
import { useUIStore } from '../../store/ui'

export function Toast() {
  const { toast, dismissToast } = useUIStore()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, 2400)
    return () => clearTimeout(t)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div style={{
      position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 18px', borderRadius: 99,
      background: 'rgba(12,16,28,0.95)',
      border: `1px solid ${toast.color}55`,
      color: toast.color, fontSize: 12.5, fontWeight: 600,
      zIndex: 200, whiteSpace: 'nowrap',
      boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
      animation: 'xn-toast 0.3s ease-out',
    }}>
      {toast.message}
    </div>
  )
}
```

- [ ] **Step 3: Write `ProtectedRoute.tsx`**

```tsx
// frontend/src/shared/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/components/
git commit -m "feat: Modal, Toast, ProtectedRoute shared components"
```

---

### Task 8: BottomNav + DevFrame

**Files:**
- Create: `frontend/src/shared/components/BottomNav.tsx`
- Create: `frontend/src/shared/components/DevFrame.tsx`
- Create: `frontend/src/shared/icons/index.tsx`

- [ ] **Step 1: Write `frontend/src/shared/icons/index.tsx`**

Copy all SVG icon functions from `docs/design/screens.jsx` lines 7–60 into typed TSX:

```tsx
// frontend/src/shared/icons/index.tsx
export const Icons = {
  home: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>,
  bank: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v9"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M19 10v9"/><path d="M3 21h18"/></svg>,
  chart: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>,
  user: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  plus: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  chev: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>,
  close: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  card: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20"/></svg>,
  bell: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  gear: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  logout: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>,
}
```

- [ ] **Step 2: Write `BottomNav.tsx`**

```tsx
// frontend/src/shared/components/BottomNav.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { Icons } from '../icons'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../tokens'

const TABS = [
  { to: '/',          label: 'Главная',   icon: Icons.home },
  { to: '/accounts',  label: 'Счета',     icon: Icons.bank },
  { to: '/analytics', label: 'Аналитика', icon: Icons.chart },
  { to: '/profile',   label: 'Профиль',   icon: Icons.user },
]

export function BottomNav() {
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 20px)', paddingTop: 10,
      background: 'linear-gradient(to top, rgba(8,10,20,0.97) 60%, rgba(8,10,20,0))',
      backdropFilter: 'blur(20px)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
      borderTop: `1px solid ${COLORS.border}`,
      zIndex: 30,
    }}>
      {TABS.slice(0, 2).map(tab => <NavItem key={tab.to} {...tab} />)}
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <button
          onClick={() => openModal('add-tx')}
          style={{
            width: 50, height: 50, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 0, color: '#fff', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 10px 22px var(--accent-shadow)',
            transform: 'translateY(-6px)',
          }}
        >
          {Icons.plus(22)}
        </button>
      </div>
      {TABS.slice(2).map(tab => <NavItem key={tab.to} {...tab} />)}
    </div>
  )
}

function NavItem({ to, label, icon }: typeof TABS[0]) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      background: 'none', border: 0, cursor: 'pointer', textDecoration: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      color: isActive ? 'var(--accent)' : COLORS.textMuted, padding: 0,
    })}>
      {({ isActive }) => (
        <>
          <div style={{
            width: 38, height: 28, borderRadius: 9,
            background: isActive ? 'var(--accent-tint)' : 'transparent',
            display: 'grid', placeItems: 'center',
          }}>
            {icon(20)}
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
```

- [ ] **Step 3: Write `DevFrame.tsx`**

```tsx
// frontend/src/shared/components/DevFrame.tsx
interface Props { children: React.ReactNode }

export function DevFrame({ children }: Props) {
  if (import.meta.env.VITE_DEV_FRAME !== 'true') return <>{children}</>
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '20px 12px', background: 'radial-gradient(ellipse at top, #0b0f1c 0%, #04060d 70%)' }}>
      <div style={{
        width: 390, height: 844, borderRadius: 54, overflow: 'hidden', position: 'relative',
        background: '#04060d',
        boxShadow: '0 0 0 10px #1a1a1a, 0 0 0 12px #2a2a2a, 0 30px 80px rgba(0,0,0,0.8)',
      }}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/
git commit -m "feat: BottomNav, DevFrame, icons"
```

---

### Task 9: App.tsx + routes + theme wiring

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Write `frontend/src/App.tsx`**

```tsx
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DevFrame } from './shared/components/DevFrame'
import { BottomNav } from './shared/components/BottomNav'
import { Toast } from './shared/components/Toast'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { useUIStore } from './store/ui'
import { THEMES } from './shared/tokens'
import { LoginScreen } from './features/auth/LoginScreen'
import { RegisterScreen } from './features/auth/RegisterScreen'

// Lazy placeholders — replaced in plan 06b
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 32, color: '#6c7488', paddingBottom: 120 }}>{name} screen</div>
)

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
            <Route path="/" element={<><Placeholder name="Home" /><BottomNav /></>} />
            <Route path="/accounts" element={<><Placeholder name="Accounts" /><BottomNav /></>} />
            <Route path="/analytics" element={<><Placeholder name="Analytics" /><BottomNav /></>} />
            <Route path="/profile" element={<><Placeholder name="Profile" /><BottomNav /></>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </div>
    </DevFrame>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: App shell with routes, theme wiring, QueryClient"
```

---

### Task 10: Login + Register screens

**Files:**
- Create: `frontend/src/features/auth/LoginScreen.tsx`
- Create: `frontend/src/features/auth/RegisterScreen.tsx`

- [ ] **Step 1: Write `LoginScreen.tsx`**

```tsx
// frontend/src/features/auth/LoginScreen.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/endpoints/auth'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../../shared/tokens'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const showToast = useUIStore((s) => s.showToast)

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      navigate('/', { replace: true })
    },
    onError: () => showToast('Неверный email или пароль', COLORS.expense),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary }}>Добро пожаловать</div>
        <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 6 }}>Войдите в свой аккаунт XNoll</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" required autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Пароль" required autoComplete="current-password"
          style={inputStyle}
        />
        <button type="submit" disabled={mutation.isPending} style={btnStyle(!mutation.isPending)}>
          {mutation.isPending ? 'Входим...' : 'Войти'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: COLORS.textSecondary }}>
        Нет аккаунта?{' '}
        <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 16, fontSize: 15,
  background: COLORS.surface2, border: `1.5px solid ${COLORS.border}`,
  color: COLORS.textPrimary, outline: 'none', width: '100%', boxSizing: 'border-box',
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: 15, borderRadius: 16, fontSize: 15, fontWeight: 700,
  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
  color: active ? '#fff' : COLORS.textSecondary,
  border: 0, cursor: active ? 'pointer' : 'default',
  boxShadow: active ? '0 10px 22px var(--accent-shadow)' : 'none',
})
```

- [ ] **Step 2: Write `RegisterScreen.tsx`**

```tsx
// frontend/src/features/auth/RegisterScreen.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/endpoints/auth'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../../shared/tokens'
import type { Currency } from '../../api/types'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']

export function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const showToast = useUIStore((s) => s.showToast)

  const mutation = useMutation({
    mutationFn: async (data: Parameters<typeof authApi.register>[0]) => {
      await authApi.register(data)
      return authApi.login({ email: data.email, password: data.password })
    },
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token)
      navigate('/', { replace: true })
    },
    onError: () => showToast('Ошибка регистрации. Попробуйте другой email.', COLORS.expense),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password, full_name: fullName, primary_currency: currency })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary }}>Создать аккаунт</div>
        <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 6 }}>Начните управлять финансами</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя" required style={inputStyle} />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="email" style={inputStyle} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required autoComplete="new-password" minLength={8} style={inputStyle} />

        <div style={{ display: 'flex', gap: 8 }}>
          {CURRENCIES.map(c => (
            <button key={c} type="button" onClick={() => setCurrency(c)} style={{
              flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 14, fontWeight: 600,
              background: currency === c ? 'var(--accent-tint)' : COLORS.surface2,
              border: `1.5px solid ${currency === c ? 'var(--accent)' : COLORS.border}`,
              color: currency === c ? 'var(--accent)' : COLORS.textSecondary,
              cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <button type="submit" disabled={mutation.isPending} style={btnStyle(!mutation.isPending)}>
          {mutation.isPending ? 'Создаём...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: COLORS.textSecondary }}>
        Уже есть аккаунт?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Войти</Link>
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 16, fontSize: 15,
  background: COLORS.surface2, border: `1.5px solid ${COLORS.border}`,
  color: COLORS.textPrimary, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: 15, borderRadius: 16, fontSize: 15, fontWeight: 700,
  background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
  color: active ? '#fff' : COLORS.textSecondary,
  border: 0, cursor: active ? 'pointer' : 'default',
  boxShadow: active ? '0 10px 22px var(--accent-shadow)' : 'none',
})
```

- [ ] **Step 3: Add CORS middleware to backend**

```python
# backend/app/main.py — add after app = FastAPI(...)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 4: Start backend + frontend, test full login flow**

```bash
# Terminal 1
cd /home/daniel/xnoll && docker-compose up api db

# Terminal 2
cd /home/daniel/xnoll/frontend && npm run dev
```

Open `http://localhost:5173`. Register → redirects to `/` showing "Home screen" placeholder. Open `/login` with wrong creds → red toast "Неверный email или пароль".

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/ backend/app/main.py
git commit -m "feat: login + register screens; CORS wired to backend"
```

---

## End of Plan 06a

**Next:** `docs/superpowers/implem/2026-05-26-06b-frontend-screens.md` — Home, AddTxModal, Accounts, Analytics, Profile screens + Docker frontend service.
