# XNoll Frontend — Design Spec

**Date:** 2026-05-26
**Stack:** Vite + React 18 + TypeScript + Tailwind CSS + TanStack Query + Zustand + React Router v6

---

## 1. Project Structure

```
frontend/
  src/
    api/
      client.ts          # axios instance; baseURL = VITE_API_URL (default http://localhost:8000)
      types.ts           # all API types mirroring Pydantic schemas — single source of truth
      endpoints/
        transactions.ts
        accounts.ts
        deposits.ts
        stats.ts
    features/
      home/
        components/
        hooks/
        index.ts
      accounts/
        components/
        hooks/
        index.ts
      transactions/
        components/      # AddModal (3-step wizard)
        hooks/           # useCreateTransaction
        index.ts
      analytics/
        components/
        hooks/           # useCategoryStats, useTimeline, useAccountStats
        index.ts
      profile/
        components/
        index.ts
    shared/
      components/        # Modal, Toast, BottomNav, DevFrame
      icons/             # SVG icons from prototype
      hooks/             # useTheme, useToast
      lib/               # formatAmount, formatDate — pure functions, no platform deps
      tokens.ts          # colors, spacing, radii, typography — shared with future RN
    store/
      ui.ts              # Zustand store
    App.tsx
    main.tsx
  index.html
  vite.config.ts         # /api proxy → localhost:8000
  tailwind.config.ts
  tsconfig.json
```

### React Native compatibility

`tokens.ts`, `api/types.ts`, `shared/lib/`, and `shared/hooks/` contain zero platform-specific code and will be reused verbatim in the future React Native app. UI components are web-only and will have separate RN equivalents, but share the same tokens and types — ensuring visual parity.

---

## 2. Routing & Navigation

React Router v6 with flat routes:

| Path | Feature | Component |
|---|---|---|
| `/` | home | `<HomeScreen>` |
| `/accounts` | accounts | `<AccountsScreen>` |
| `/analytics` | analytics | `<AnalyticsScreen>` |
| `/profile` | profile | `<ProfileScreen>` |

`<BottomNav>` uses `<NavLink>` — no page reload, instant tab switch. The center `+` button opens `AddTxModal` via Zustand action, not a route.

`<DevFrame>` (iOS shell from prototype) wraps the app only when `VITE_DEV_FRAME=true`. In production it is absent.

---

## 3. API Client & Types

### `api/client.ts`
- axios instance with `baseURL = import.meta.env.VITE_API_URL`
- Response interceptor: on any error, dispatches a Toast via Zustand

### `api/types.ts`
```ts
type Currency = 'RUB' | 'USD' | 'EUR'
type Period = 'week' | 'month' | 'year'

interface Transaction {
  id: string; title: string; amount: number
  category: string; account_id: string; created_at: string
}
interface CreateTransactionDto {
  amount: number; category: string; account_id: string; kind: 'income' | 'expense'
}

interface Account {
  id: string; bank: string; balance: number
  currency: Currency; kind: 'savings' | 'deposit'; tag_color: string; delta: number
}
interface Deposit extends Account {
  rate: number; ends_at: string; accrued: number
}

interface TransferDto { from_account_id: string; to_account_id: string; amount: number }

interface CategoryStat { category: string; total: number; count: number }
interface TimelinePoint { date: string; income: number; expense: number }
interface AccountStat { account_id: string; bank: string; total: number }
```

### `api/endpoints/`
Each file exports async functions:
- `transactions.ts` → `getTransactions(params?)`, `createTransaction(dto: CreateTransactionDto)`
- `accounts.ts` → `getAccounts()`, `transfer(dto: TransferDto)`
- `deposits.ts` → `getDeposits()`, `createDeposit(dto)`
- `stats.ts` → `getCategoryStats(period)`, `getTimeline(period)`, `getAccountStats(period)`

TanStack Query hooks live inside each feature's `hooks/` folder, e.g.:
```ts
// features/analytics/hooks/useStats.ts
export const useCategoryStats = (period: Period) =>
  useQuery({ queryKey: ['stats', 'categories', period], queryFn: () => getCategoryStats(period) })
```

---

## 4. Screens & Features

### `home/`
- Total balance across all accounts; toggle visibility (Zustand `balanceVisible`)
- Recent transactions list via `useQuery(['transactions'])` → `GET /transactions`
- Quick action buttons: `+ Доход` / `− Расход` → open `AddTxModal` with preset kind

### `accounts/`
- Account list from `useQuery(['accounts'])` → `GET /accounts`
- Savings and deposits rendered separately
- Tap on deposit → `DepositDetailModal` (rate, maturity date, accrued interest)
- Tap on savings account → `AccountDetailModal` (transaction history filtered by account)
- "Перевод" button → `TransferModal` (3-step: from → to → amount+confirm)

### `transactions/` (shared feature, no dedicated screen)
- `AddTxModal`: 3-step wizard matching prototype exactly
  - Step 1: numeric keypad → amount
  - Step 2: category grid + account selector
  - Step 3: flow diagram (from→amount→to) + details table + confirm
- `useCreateTransaction` → `POST /transactions`; on success: invalidate `['transactions']` and `['accounts']` queries, show Toast

### `analytics/`
- Period toggle: week / month / year → passed to all three stat hooks
- Category breakdown: bar chart or donut → `useCategoryStats(period)` → `GET /stats/categories`
- Income/expense timeline: line or bar chart → `useTimeline(period)` → `GET /stats/timeline`
- Per-account summary → `useAccountStats(period)` → `GET /stats/accounts`
- Chart library: **Recharts** (lightweight, works well with Tailwind)

### `profile/`
- Theme picker (violet / teal / amber / rose) → writes to Zustand + `localStorage`
- Balance visibility toggle
- Other settings: stubs for first iteration

---

## 5. Modals & UI State

### Zustand `store/ui.ts`
```ts
interface UIStore {
  // activeTab is NOT here — it is derived from the URL via useLocation()
  modal: { type: 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | null; payload?: unknown }
  toast: { message: string; color: string } | null
  theme: 'violet' | 'teal' | 'amber' | 'rose'
  balanceVisible: boolean
  // actions
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  showToast: (message: string, color: string) => void
  setTheme: (theme: Theme) => void
  toggleBalance: () => void
}
```

### Modal inventory

| Modal | Trigger | Backend call |
|---|---|---|
| `AddTxModal` | `+` nav button | `POST /transactions` |
| `TransferModal` | Accounts screen button | `POST /transfers` |
| `DepositDetailModal` | Tap on deposit card | `GET /deposits/{id}` |
| `AccountDetailModal` | Tap on savings card | `GET /transactions?account_id=` |

### `shared/components/Modal`
Base bottom-sheet wrapper used by all modals:
- Dark backdrop with `backdrop-filter: blur`
- Slide-up CSS animation (`translate-y-full` → `translate-y-0`)
- Drag handle at top
- Close on backdrop tap
- `children` prop for content

### `shared/components/Toast`
- Positioned absolutely above `<BottomNav>`
- Controlled via `ui.toast`; auto-dismissed after 2400ms
- Color prop for income (green) vs expense (red) vs error (red)

---

## 6. Theme & Design Tokens

### `shared/tokens.ts`
```ts
export const THEMES = {
  violet: { accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7', glow: 'rgba(99,102,241,0.20)', shadow: 'rgba(99,102,241,0.45)' },
  teal:   { accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4', glow: 'rgba(20,184,166,0.18)',  shadow: 'rgba(20,184,166,0.45)' },
  amber:  { accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24', glow: 'rgba(245,158,11,0.18)',  shadow: 'rgba(245,158,11,0.45)' },
  rose:   { accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e', glow: 'rgba(236,72,153,0.18)',  shadow: 'rgba(236,72,153,0.45)' },
}

export const COLORS = {
  bg:      '#04060d',
  surface: '#0a0e1a',
  border:  'rgba(255,255,255,0.06)',
  textPrimary:   '#e6e9f2',
  textSecondary: '#6c7488',
  textMuted:     '#3e455a',
}
```

CSS variables (`--accent`, `--accent-2`, etc.) are set on `:root` in `App.tsx` via `useEffect` when theme changes — identical to prototype behaviour. Tailwind config extends these as custom colours.

---

## 7. Dev Environment

- `frontend/` lives alongside `backend/` in the repo root
- `docker-compose.yml` gets a `frontend` service: `vite --host`, port `5173`
- `vite.config.ts` proxy: `/api → http://backend:8000` (Docker) or `http://localhost:8000` (local)
- `.env.example`: `VITE_API_URL=http://localhost:8000`, `VITE_DEV_FRAME=true`
- FastAPI `CORSMiddleware`: `allow_origins=["http://localhost:5173"]`

---

## 8. Out of Scope (first iteration)

- Authentication / login screen
- Push notifications
- Offline mode / service worker
- React Native app (future)
- E2E tests (Playwright) — added after core screens work
