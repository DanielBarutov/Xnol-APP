# Expo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate xnoll into a monorepo with a shared API layer and a new native Expo app (iOS + Android) while leaving the existing React/Vite web app untouched.

**Architecture:** Three packages in one repo — `shared/` (axios client, API endpoints, types, format utils), `frontend/` (unchanged web app, imports updated to use `@xnoll/shared`), `mobile/` (new Expo SDK 52 app with expo-router, React Native UI, expo-secure-store for tokens). Both platforms use the same axios instance with platform-specific auth callbacks.

**Tech Stack:** Expo SDK 52, expo-router v4, zustand v5, @tanstack/react-query v5, axios, expo-secure-store, victory-native, lucide-react-native, @gorhom/bottom-sheet, react-native-safe-area-context, react-native-gesture-handler

---

## File Map

### New files — `shared/`
- `shared/package.json` — local npm package `@xnoll/shared`
- `shared/tsconfig.json`
- `shared/index.ts` — barrel export
- `shared/api/client.ts` — axios instance with `initApiClient()` config injection
- `shared/api/types.ts` — all TypeScript interfaces (moved from `frontend/src/api/types.ts`)
- `shared/api/endpoints/auth.ts`
- `shared/api/endpoints/accounts.ts`
- `shared/api/endpoints/transactions.ts`
- `shared/api/endpoints/categories.ts`
- `shared/api/endpoints/deposits.ts`
- `shared/api/endpoints/transfers.ts`
- `shared/api/endpoints/stats.ts`
- `shared/lib/format.ts` — formatAmount, formatCurrency, formatDate, categoryEmoji

### Modified files — `frontend/`
- `frontend/package.json` — add `"@xnoll/shared": "file:../shared"`
- `frontend/src/main.tsx` — call `initApiClient()` at startup
- `frontend/src/api/client.ts` — re-export from `@xnoll/shared`
- `frontend/src/api/types.ts` — re-export from `@xnoll/shared`
- `frontend/src/api/endpoints/*.ts` — re-export from `@xnoll/shared`
- `frontend/src/shared/lib/format.ts` — re-export from `@xnoll/shared`

### New files — `mobile/`
- `mobile/package.json`
- `mobile/tsconfig.json`
- `mobile/app.json`
- `mobile/metro.config.js` — monorepo symlink resolution
- `mobile/.env` — `EXPO_PUBLIC_API_URL`
- `mobile/store/auth.ts` — zustand with expo-secure-store
- `mobile/store/ui.ts` — theme, modal, balanceVisible
- `mobile/theme/tokens.ts` — THEMES, COLORS as JS objects
- `mobile/theme/ThemeProvider.tsx` — React context wrapping theme
- `mobile/lib/format.ts` — re-export from `@xnoll/shared`
- `mobile/app/_layout.tsx` — RootLayout: providers + AuthGuard
- `mobile/app/(auth)/_layout.tsx`
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/register.tsx`
- `mobile/app/(tabs)/_layout.tsx` — tab navigator
- `mobile/app/(tabs)/index.tsx` — HomeScreen mount
- `mobile/app/(tabs)/accounts.tsx`
- `mobile/app/(tabs)/analytics.tsx`
- `mobile/app/(tabs)/profile.tsx`
- `mobile/components/BottomTabBar.tsx` — custom 5-slot bottom nav
- `mobile/components/Sheet.tsx` — thin @gorhom/bottom-sheet wrapper
- `mobile/components/Toast.tsx`
- `mobile/features/home/HomeScreen.tsx`
- `mobile/features/home/useHomeData.ts`
- `mobile/features/accounts/AccountsScreen.tsx`
- `mobile/features/accounts/CreateAccountSheet.tsx`
- `mobile/features/accounts/AccountEditSheet.tsx`
- `mobile/features/accounts/TransferSheet.tsx`
- `mobile/features/accounts/CreateDepositSheet.tsx`
- `mobile/features/transactions/AddTxSheet.tsx`
- `mobile/features/transactions/TransactionDetailSheet.tsx`
- `mobile/features/transactions/AllTransactionsSheet.tsx`
- `mobile/features/analytics/AnalyticsScreen.tsx`
- `mobile/features/analytics/useStats.ts`
- `mobile/features/profile/ProfileScreen.tsx`

---

## Task 1: Create `shared/` package

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/index.ts`
- Create: `shared/api/client.ts`
- Create: `shared/api/types.ts`
- Create: `shared/api/endpoints/auth.ts`
- Create: `shared/api/endpoints/accounts.ts`
- Create: `shared/api/endpoints/transactions.ts`
- Create: `shared/api/endpoints/categories.ts`
- Create: `shared/api/endpoints/deposits.ts`
- Create: `shared/api/endpoints/transfers.ts`
- Create: `shared/api/endpoints/stats.ts`
- Create: `shared/lib/format.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/endpoints/*.ts` (7 files)
- Modify: `frontend/src/shared/lib/format.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "@xnoll/shared",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "types": "index.ts",
  "peerDependencies": {
    "axios": ">=1.0.0"
  }
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: Create shared/api/types.ts**

Copy verbatim from `frontend/src/api/types.ts` (no changes needed).

- [ ] **Step 4: Create shared/api/client.ts**

The key difference from the web version: `onLogout` callback instead of `window.location.replace`, so it works on both web and mobile.

```ts
import axios from 'axios'

interface ApiClientConfig {
  baseURL: string
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (access: string, refresh: string) => void
  onLogout: () => void
}

let cfg: ApiClientConfig = {
  baseURL: '',
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  onLogout: () => {},
}

export function initApiClient(config: ApiClientConfig) {
  cfg = config
  api.defaults.baseURL = config.baseURL
}

export const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((axiosConfig) => {
  const token = cfg.getAccessToken()
  if (token) axiosConfig.headers.Authorization = `Bearer ${token}`
  return axiosConfig
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        const rt = cfg.getRefreshToken()
        if (!rt) {
          cfg.onLogout()
          return Promise.reject(error)
        }
        refreshing = axios
          .post(`${cfg.baseURL}/api/v1/auth/refresh`, { refresh_token: rt })
          .then((res) => {
            const { access_token, refresh_token } = res.data
            cfg.setTokens(access_token, refresh_token)
            return access_token as string
          })
          .catch(() => {
            cfg.onLogout()
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

- [ ] **Step 5: Create shared/api/endpoints/ (7 files)**

Copy each file from `frontend/src/api/endpoints/` verbatim — they only need `import { api } from '../client'` which now points to the shared client.

`shared/api/endpoints/auth.ts`:
```ts
import { api } from '../client'
import type { LoginRequest, RegisterRequest, ThemePatchRequest, ThemeResponse, TokenResponse, UserResponse } from '../types'

export const authApi = {
  login: (data: LoginRequest) => api.post<TokenResponse>('/api/v1/auth/login', data).then(r => r.data),
  register: (data: RegisterRequest) => api.post<UserResponse>('/api/v1/auth/register', data).then(r => r.data),
  me: () => api.get<UserResponse>('/api/v1/auth/me').then(r => r.data),
  refresh: (refresh_token: string) => api.post<TokenResponse>('/api/v1/auth/refresh', { refresh_token }).then(r => r.data),
  getTheme: () => api.get<ThemeResponse>('/api/v1/users/me/theme').then(r => r.data),
  patchTheme: (data: ThemePatchRequest) => api.patch<ThemeResponse>('/api/v1/users/me/theme', data).then(r => r.data),
}
```

Copy `accounts.ts`, `transactions.ts`, `categories.ts`, `deposits.ts`, `transfers.ts`, `stats.ts` verbatim from `frontend/src/api/endpoints/` — only change the import path to `'../client'` and `'../types'`.

- [ ] **Step 6: Create shared/lib/format.ts**

Copy verbatim from `frontend/src/shared/lib/format.ts`.

- [ ] **Step 7: Create shared/index.ts**

```ts
export * from './api/client'
export * from './api/types'
export * from './api/endpoints/auth'
export * from './api/endpoints/accounts'
export * from './api/endpoints/transactions'
export * from './api/endpoints/categories'
export * from './api/endpoints/deposits'
export * from './api/endpoints/transfers'
export * from './api/endpoints/stats'
export * from './lib/format'
```

- [ ] **Step 8: Add @xnoll/shared to frontend/package.json**

Add to the `"dependencies"` section:
```json
"@xnoll/shared": "file:../shared"
```

Run `npm install` from `frontend/`:
```bash
cd frontend && npm install
```

- [ ] **Step 9: Update frontend/src/api/client.ts to re-export from shared**

Replace the entire file with:
```ts
export { api, initApiClient } from '@xnoll/shared'
```

- [ ] **Step 10: Update frontend/src/api/types.ts to re-export from shared**

Replace the entire file with:
```ts
export * from '@xnoll/shared'
```

- [ ] **Step 11: Update each frontend/src/api/endpoints/*.ts to re-export from shared**

Replace each file:

`frontend/src/api/endpoints/auth.ts`:
```ts
export { authApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/accounts.ts`:
```ts
export { accountsApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/transactions.ts`:
```ts
export { transactionsApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/categories.ts`:
```ts
export { categoriesApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/deposits.ts`:
```ts
export { depositsApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/transfers.ts`:
```ts
export { transfersApi } from '@xnoll/shared'
```

`frontend/src/api/endpoints/stats.ts`:
```ts
export { statsApi } from '@xnoll/shared'
```

- [ ] **Step 12: Update frontend/src/shared/lib/format.ts to re-export from shared**

Replace the entire file with:
```ts
export * from '@xnoll/shared'
```

- [ ] **Step 13: Update frontend/src/main.tsx to call initApiClient**

Add these lines after the imports:
```tsx
import { initApiClient } from '@xnoll/shared'
import { useAuthStore } from './store/auth'

initApiClient({
  baseURL: '',
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  onLogout: () => {
    useAuthStore.getState().logout()
    window.location.replace('/login')
  },
})
```

- [ ] **Step 14: Verify frontend still builds**

```bash
cd frontend && npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 15: Commit**

```bash
git add shared/ frontend/package.json frontend/package-lock.json frontend/src/main.tsx frontend/src/api/ frontend/src/shared/lib/format.ts
git commit -m "feat: extract shared API layer into @xnoll/shared package"
```

---

## Task 2: Initialize Expo project

**Files:**
- Create: `mobile/` (entire Expo project)
- Create: `mobile/metro.config.js`
- Create: `mobile/.env`

- [ ] **Step 1: Scaffold Expo project**

```bash
cd /home/daniel/xnoll
npx create-expo-app mobile --template blank-typescript
```

- [ ] **Step 2: Install all required dependencies**

```bash
cd mobile
npx expo install expo-router expo-secure-store expo-constants
npx expo install react-native-safe-area-context react-native-screens react-native-gesture-handler
npx expo install @tanstack/react-query zustand axios
npx expo install lucide-react-native react-native-svg
npx expo install victory-native react-native-reanimated
npm install @gorhom/bottom-sheet
```

- [ ] **Step 3: Add @xnoll/shared to mobile/package.json**

Add to `"dependencies"`:
```json
"@xnoll/shared": "file:../shared"
```

Then run:
```bash
npm install
```

- [ ] **Step 4: Update mobile/app.json for expo-router**

Replace the existing `app.json` with:
```json
{
  "expo": {
    "name": "Xnoll",
    "slug": "xnoll",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "xnoll",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.xnoll.app"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#12151f"
      },
      "package": "com.xnoll.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 5: Update mobile/tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 6: Create mobile/metro.config.js for monorepo symlink resolution**

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Allow Metro to resolve the shared package via symlink
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
]

config.watchFolders = [path.resolve(__dirname, '../shared')]

module.exports = config
```

- [ ] **Step 7: Create mobile/.env**

```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

> For testing on a physical device, replace `localhost` with your machine's local IP (e.g. `192.168.1.X:8000`).

- [ ] **Step 8: Add babel plugin for reanimated**

In `mobile/babel.config.js` (create if missing):
```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

- [ ] **Step 9: Verify Expo starts**

```bash
cd mobile && npx expo start
```

Expected: QR code appears, Metro bundler starts. Scan with Expo Go — you should see a blank screen (no crash). Press `Ctrl+C`.

- [ ] **Step 10: Commit**

```bash
cd ..
git add mobile/
git commit -m "feat: initialize Expo mobile project with monorepo config"
```

---

## Task 3: Theme system

**Files:**
- Create: `mobile/theme/tokens.ts`
- Create: `mobile/theme/ThemeProvider.tsx`

- [ ] **Step 1: Create mobile/theme/tokens.ts**

Ports the web `tokens.ts` to plain TypeScript objects (no CSS variables).

```ts
export type ThemeName = 'violet' | 'teal' | 'amber' | 'rose'
export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  accent: string
  accent2: string
  accent3: string
  accentTint: string
  accentShadow: string
  bg: string
  surface: string
  surface2: string
  border: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  income: string
  expense: string
}

const ACCENTS: Record<ThemeName, { accent: string; accent2: string; accent3: string; shadow: string }> = {
  violet: { accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7', shadow: 'rgba(99,102,241,0.45)' },
  teal:   { accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4', shadow: 'rgba(20,184,166,0.45)' },
  amber:  { accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24', shadow: 'rgba(245,158,11,0.45)' },
  rose:   { accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e', shadow: 'rgba(236,72,153,0.45)' },
}

const DARK_BASE: Omit<ThemeColors, 'accent' | 'accent2' | 'accent3' | 'accentTint' | 'accentShadow'> = {
  bg: '#12151f',
  surface: '#1a1e2e',
  surface2: '#222640',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.38)',
  income: '#34d399',
  expense: '#f87171',
}

const LIGHT_BASE: Omit<ThemeColors, 'accent' | 'accent2' | 'accent3' | 'accentTint' | 'accentShadow'> = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surface2: '#eef0f7',
  border: 'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(0,0,0,0.14)',
  textPrimary: '#0f1117',
  textSecondary: 'rgba(0,0,0,0.60)',
  textMuted: 'rgba(0,0,0,0.38)',
  income: '#059669',
  expense: '#dc2626',
}

export function buildTheme(name: ThemeName, mode: ThemeMode): ThemeColors {
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE
  const a = ACCENTS[name]
  return {
    ...base,
    accent: a.accent,
    accent2: a.accent2,
    accent3: a.accent3,
    accentTint: a.accent + '22',
    accentShadow: a.shadow,
  }
}
```

- [ ] **Step 2: Create mobile/theme/ThemeProvider.tsx**

```tsx
import React, { createContext, useContext } from 'react'
import { useUIStore } from '../store/ui'
import { buildTheme, ThemeColors } from './tokens'

const ThemeContext = createContext<ThemeColors | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeName = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const colors = buildTheme(themeName, themeMode)
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeColors {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/theme/
git commit -m "feat(mobile): add theme system with ThemeProvider"
```

---

## Task 4: Mobile auth store + secure token storage

**Files:**
- Create: `mobile/store/auth.ts`
- Create: `mobile/store/ui.ts`

- [ ] **Step 1: Create mobile/store/auth.ts**

Uses expo-secure-store as the zustand persist storage backend.

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { UserResponse } from '@xnoll/shared'

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

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
    {
      name: 'xnoll-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
```

- [ ] **Step 2: Create mobile/store/ui.ts**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ThemeName, ThemeMode } from '../theme/tokens'

export type ModalType =
  | 'add-tx'
  | 'transfer'
  | 'deposit-detail'
  | 'account-detail'
  | 'account-edit'
  | 'create-account'
  | 'create-deposit'
  | 'categories'
  | 'all-transactions'
  | 'transaction-detail'
  | null

interface UIState {
  modal: { type: ModalType; payload?: unknown }
  toast: { message: string; color: string } | null
  theme: ThemeName
  themeMode: ThemeMode
  balanceVisible: boolean
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  showToast: (message: string, color: string) => void
  dismissToast: () => void
  setTheme: (theme: ThemeName) => void
  setThemeMode: (mode: ThemeMode) => void
  toggleBalance: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modal: { type: null },
      toast: null,
      theme: 'violet',
      themeMode: 'dark',
      balanceVisible: true,
      openModal: (type, payload) => set({ modal: { type, payload } }),
      closeModal: () => set({ modal: { type: null } }),
      showToast: (message, color) => set({ toast: { message, color } }),
      dismissToast: () => set({ toast: null }),
      setTheme: (theme) => set({ theme }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleBalance: () => set((s) => ({ balanceVisible: !s.balanceVisible })),
    }),
    {
      name: 'xnoll-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ theme: s.theme, themeMode: s.themeMode, balanceVisible: s.balanceVisible }),
    },
  ),
)
```

> Note: install AsyncStorage: `npx expo install @react-native-async-storage/async-storage`

- [ ] **Step 3: Install AsyncStorage**

```bash
cd mobile && npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 4: Commit**

```bash
git add mobile/store/
git commit -m "feat(mobile): add auth and UI stores with secure/async storage"
```

---

## Task 5: Root layout + navigation skeleton

**Files:**
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/(auth)/_layout.tsx`
- Create: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/components/BottomTabBar.tsx`

- [ ] **Step 1: Create mobile/app/_layout.tsx**

```tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../theme/ThemeProvider'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { initApiClient, authApi } from '@xnoll/shared'
import Constants from 'expo-constants'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AuthGuard() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    const inAuth = segments[0] === '(auth)'
    if (!accessToken && !inAuth) router.replace('/(auth)/login')
    else if (accessToken && inAuth) router.replace('/(tabs)/')
  }, [accessToken, segments])

  useEffect(() => {
    if (!accessToken) return
    authApi.me().then(setUser).catch(() => {})
    authApi.getTheme().then((t) => {
      setThemeMode(t.theme_mode as 'dark' | 'light')
      if (['violet', 'teal', 'amber', 'rose'].includes(t.theme_color)) {
        setTheme(t.theme_color as any)
      }
    }).catch(() => {})
  }, [accessToken])

  return null
}

export default function RootLayout() {
  useEffect(() => {
    const baseURL =
      Constants.expoConfig?.extra?.apiUrl ??
      process.env.EXPO_PUBLIC_API_URL ??
      'http://localhost:8000'

    initApiClient({
      baseURL,
      getAccessToken: () => useAuthStore.getState().accessToken,
      getRefreshToken: () => useAuthStore.getState().refreshToken,
      setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
      onLogout: () => useAuthStore.getState().logout(),
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthGuard />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: Create mobile/app/(auth)/_layout.tsx**

```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: Create mobile/components/BottomTabBar.tsx**

```tsx
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Landmark, BarChart3, User, Plus } from 'lucide-react-native'
import { useTheme } from '../theme/ThemeProvider'
import { useUIStore } from '../store/ui'

const TABS = [
  { path: '/(tabs)/',          href: '/',          label: 'Главная',   Icon: Home },
  { path: '/(tabs)/accounts',  href: '/accounts',  label: 'Счета',     Icon: Landmark },
  { path: '/(tabs)/analytics', href: '/analytics', label: 'Аналитика', Icon: BarChart3 },
  { path: '/(tabs)/profile',   href: '/profile',   label: 'Профиль',   Icon: User },
]

export function BottomTabBar() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  const openModal = useUIStore((s) => s.openModal)

  return (
    <View style={[styles.container, {
      paddingBottom: insets.bottom + 6,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    }]}>
      {TABS.slice(0, 2).map(({ href, label, Icon }) => {
        const active = pathname === href || (href === '/' && pathname === '')
        return (
          <TouchableOpacity key={href} style={styles.tab} onPress={() => router.push(href as any)}>
            <View style={[styles.pill, active && { backgroundColor: colors.accentTint }]}>
              <Icon size={20} color={active ? colors.accent : colors.textMuted} />
            </View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        )
      })}

      <TouchableOpacity style={styles.tab} onPress={() => openModal('add-tx')}>
        <View style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accentShadow }]}>
          <Plus size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      {TABS.slice(2).map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <TouchableOpacity key={href} style={styles.tab} onPress={() => router.push(href as any)}>
            <View style={[styles.pill, active && { backgroundColor: colors.accentTint }]}>
              <Icon size={20} color={active ? colors.accent : colors.textMuted} />
            </View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    width: 38,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
})
```

- [ ] **Step 4: Create mobile/app/(tabs)/_layout.tsx**

```tsx
import { View } from 'react-native'
import { Slot } from 'expo-router'
import { BottomTabBar } from '../../components/BottomTabBar'
import { useTheme } from '../../theme/ThemeProvider'

export default function TabsLayout() {
  const colors = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Slot />
      <BottomTabBar />
    </View>
  )
}
```

- [ ] **Step 5: Create placeholder screens so navigation works**

`mobile/app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native'
export default function HomeTab() {
  return <View style={{ flex: 1 }}><Text>Home</Text></View>
}
```

`mobile/app/(tabs)/accounts.tsx`:
```tsx
import { View, Text } from 'react-native'
export default function AccountsTab() {
  return <View style={{ flex: 1 }}><Text>Accounts</Text></View>
}
```

`mobile/app/(tabs)/analytics.tsx`:
```tsx
import { View, Text } from 'react-native'
export default function AnalyticsTab() {
  return <View style={{ flex: 1 }}><Text>Analytics</Text></View>
}
```

`mobile/app/(tabs)/profile.tsx`:
```tsx
import { View, Text } from 'react-native'
export default function ProfileTab() {
  return <View style={{ flex: 1 }}><Text>Profile</Text></View>
}
```

- [ ] **Step 6: Test in Expo Go**

```bash
cd mobile && npx expo start
```

Scan QR code. Expected: BottomTabBar is visible, tabs switch between screens, pressing + button triggers openModal (nothing visible yet — that's fine).

- [ ] **Step 7: Commit**

```bash
git add mobile/app/ mobile/components/BottomTabBar.tsx
git commit -m "feat(mobile): root layout, auth guard, tab navigation, BottomTabBar"
```

---

## Task 6: Auth screens — Login + Register

**Files:**
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Create mobile/app/(auth)/login.tsx**

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'

export default function LoginScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email || !password) { setError('Заполните все поля'); return }
    setLoading(true)
    setError(null)
    try {
      const { access_token, refresh_token } = await authApi.login({ email: email.trim(), password })
      setTokens(access_token, refresh_token)
      router.replace('/(tabs)/')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 32 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Вход в Xnoll</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Пароль"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Войти</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={[styles.link, { color: colors.accent }]}>Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', fontSize: 14, marginTop: 4 },
  error: { color: '#f87171', fontSize: 14, textAlign: 'center' },
})
```

- [ ] **Step 2: Create mobile/app/(auth)/register.tsx**

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']

export default function RegisterScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    if (!fullName || !email || !password) { setError('Заполните все поля'); return }
    setLoading(true)
    setError(null)
    try {
      await authApi.register({ full_name: fullName, email: email.trim(), password, primary_currency: currency })
      const { access_token, refresh_token } = await authApi.login({ email: email.trim(), password })
      setTokens(access_token, refresh_token)
      router.replace('/(tabs)/')
    } catch {
      setError('Ошибка регистрации. Проверьте данные.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 32 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Регистрация</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Имя"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Пароль"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Валюта</Text>
        <View style={styles.row}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyBtn, { borderColor: currency === c ? colors.accent : colors.border, backgroundColor: currency === c ? colors.accentTint : colors.surface }]}
              onPress={() => setCurrency(c)}
            >
              <Text style={{ color: currency === c ? colors.accent : colors.textSecondary, fontWeight: '600' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Создать аккаунт</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.accent }]}>Уже есть аккаунт? Войти</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: -6 },
  row: { flexDirection: 'row', gap: 10 },
  currencyBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', fontSize: 14 },
  error: { color: '#f87171', fontSize: 14, textAlign: 'center' },
})
```

- [ ] **Step 3: Test auth flow in Expo Go**

Open the app. Expected: Login screen appears. Enter credentials of an existing account. Expected: navigates to Home tab (placeholder text "Home"). Press back — stays logged in. Kill the app and reopen — stays logged in (token persisted in SecureStore).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(auth)/
git commit -m "feat(mobile): add Login and Register screens with SecureStore auth"
```

---

## Task 7: Home screen

**Files:**
- Create: `mobile/features/home/useHomeData.ts`
- Create: `mobile/features/home/HomeScreen.tsx`
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Create mobile/features/home/useHomeData.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi, statsApi, transfersApi } from '@xnoll/shared'

export function useHomeData() {
  const accounts     = useQuery({ queryKey: ['accounts'],     queryFn: accountsApi.list })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list({ limit: 20 }) })
  const transfers    = useQuery({ queryKey: ['transfers'],    queryFn: transfersApi.list })
  const categories   = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list })
  const monthStats   = useQuery({ queryKey: ['stats', 'categories', 'this_month'], queryFn: () => statsApi.categories({ period: 'this_month' }) })

  const totalBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB') return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  return { accounts, transactions, transfers, categories, monthStats, totalBalance }
}
```

- [ ] **Step 2: Create mobile/features/home/HomeScreen.tsx**

```tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff, Plus, Minus } from 'lucide-react-native'
import { useHomeData } from './useHomeData'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'
import { formatAmount, formatCurrency, formatDate } from '@xnoll/shared'
import type { TransactionResponse, TransferResponse, CategoryResponse } from '@xnoll/shared'

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function currentMonthYear() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
}

type UnifiedEntry =
  | { kind: 'tx';       date: string; data: TransactionResponse }
  | { kind: 'transfer'; date: string; data: TransferResponse }

export function HomeScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const { accounts, transactions, transfers, categories, monthStats, totalBalance } = useHomeData()
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  const accountList = accounts.data ?? []
  const txList = transactions.data ?? []
  const transferList = transfers.data ?? []
  const categoryList = categories.data ?? []

  const catMap = Object.fromEntries(flatten(categoryList).map(c => [c.id, c]))
  const accountNameById = Object.fromEntries(accountList.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  const entries: UnifiedEntry[] = [
    ...txList.map(tx => ({ kind: 'tx' as const, date: tx.created_at, data: tx })),
    ...transferList.map(tr => ({ kind: 'transfer' as const, date: tr.created_at, data: tr })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)

  const monthIncome = parseFloat(monthStats.data?.total_income ?? '0')
  const monthExpense = Math.abs(parseFloat(monthStats.data?.total_expense ?? '0'))

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120, paddingHorizontal: 16, gap: 20 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Привет, {user?.full_name?.split(' ')[0] ?? ''}!</Text>
          <Text style={[styles.month, { color: colors.textPrimary }]}>{currentMonthYear()}</Text>
        </View>
        <TouchableOpacity onPress={toggleBalance}>
          {balanceVisible
            ? <Eye size={22} color={colors.textMuted} />
            : <EyeOff size={22} color={colors.textMuted} />
          }
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Общий баланс</Text>
        <Text style={[styles.balance, { color: colors.textPrimary }]}>
          {balanceVisible ? `${formatAmount(totalBalance)} ₽` : '••••••'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Plus size={14} color={colors.income} />
            <Text style={[styles.statVal, { color: colors.income }]}>{formatAmount(monthIncome)} ₽</Text>
          </View>
          <View style={styles.stat}>
            <Minus size={14} color={colors.expense} />
            <Text style={[styles.statVal, { color: colors.expense }]}>{formatAmount(monthExpense)} ₽</Text>
          </View>
        </View>
      </View>

      {/* Accounts strip */}
      {accountList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsStrip}>
          {accountList.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.accountChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openModal('account-detail', a)}
            >
              <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>{a.name}</Text>
              <Text style={[styles.accountBalance, { color: colors.accent }]}>
                {balanceVisible ? formatCurrency(parseFloat(a.balance), a.currency) : '••••'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Recent transactions */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>История</Text>
      {entries.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Нет транзакций</Text>
      )}
      {entries.map((entry) => {
        if (entry.kind === 'tx') {
          const tx = entry.data
          const cat = catMap[tx.category_id]
          const isIncome = tx.type === 'income'
          return (
            <TouchableOpacity
              key={tx.id}
              style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openModal('transaction-detail', tx)}
            >
              <View style={[styles.txIcon, { backgroundColor: cat?.color ? cat.color + '22' : colors.surface2 }]}>
                <Text style={styles.txIconText}>{cat?.icon ?? '📦'}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txName, { color: colors.textPrimary }]}>{cat?.name ?? 'Без категории'}</Text>
                <Text style={[styles.txSub, { color: colors.textMuted }]}>{accountNameById[tx.account_id] ?? ''}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.expense }]}>
                  {isIncome ? '+' : '-'}{formatAmount(parseFloat(tx.amount))} ₽
                </Text>
                <Text style={[styles.txDate, { color: colors.textMuted }]}>{formatDate(tx.date)}</Text>
              </View>
            </TouchableOpacity>
          )
        }
        const tr = entry.data
        const srcLabel = tr.source_label ?? accountNameById[tr.source_id ?? ''] ?? 'Внешний'
        const dstLabel = tr.dest_label ?? accountNameById[tr.dest_id ?? ''] ?? 'Внешний'
        return (
          <View
            key={tr.id}
            style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.txIcon, { backgroundColor: colors.surface2 }]}>
              <Text style={styles.txIconText}>↔️</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={[styles.txName, { color: colors.textPrimary }]}>{srcLabel} → {dstLabel}</Text>
              <Text style={[styles.txSub, { color: colors.textMuted }]}>Перевод</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: colors.textSecondary }]}>{formatCurrency(parseFloat(tr.amount), tr.currency)}</Text>
              <Text style={[styles.txDate, { color: colors.textMuted }]}>{formatDate(tr.date)}</Text>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontWeight: '500' },
  month: { fontSize: 22, fontWeight: '700' },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 6 },
  balanceLabel: { fontSize: 13 },
  balance: { fontSize: 36, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal: { fontSize: 14, fontWeight: '600' },
  accountsStrip: { marginHorizontal: -16, paddingHorizontal: 16 },
  accountChip: { marginRight: 10, borderRadius: 14, borderWidth: 1, padding: 12, minWidth: 130 },
  accountName: { fontSize: 13, fontWeight: '500' },
  accountBalance: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txName: { fontSize: 15, fontWeight: '500' },
  txSub: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '600' },
  txDate: { fontSize: 11, marginTop: 2 },
})
```

- [ ] **Step 3: Update mobile/app/(tabs)/index.tsx**

```tsx
import { HomeScreen } from '../../features/home/HomeScreen'
export default function HomeTab() {
  return <HomeScreen />
}
```

- [ ] **Step 4: Test in Expo Go**

Log in → Home screen should show balance, account chips, and transaction list. Balance hide/show toggle should work.

- [ ] **Step 5: Commit**

```bash
git add mobile/features/home/ mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): add Home screen with balance, accounts strip, transaction history"
```

---

## Task 8: Accounts screen

**Files:**
- Create: `mobile/features/accounts/AccountsScreen.tsx`
- Create: `mobile/features/accounts/CreateAccountSheet.tsx`
- Create: `mobile/features/accounts/AccountEditSheet.tsx`
- Create: `mobile/features/accounts/TransferSheet.tsx`
- Create: `mobile/components/Sheet.tsx`
- Modify: `mobile/app/(tabs)/accounts.tsx`

- [ ] **Step 1: Create mobile/components/Sheet.tsx**

Thin wrapper around @gorhom/bottom-sheet for consistent usage.

```tsx
import React, { forwardRef, useCallback } from 'react'
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useTheme } from '../theme/ThemeProvider'

interface SheetProps {
  snapPoints?: (string | number)[]
  children: React.ReactNode
  onClose?: () => void
}

export const Sheet = forwardRef<BottomSheet, SheetProps>(({ snapPoints = ['60%', '90%'], children, onClose }, ref) => {
  const colors = useTheme()

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onClose}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  )
})
```

- [ ] **Step 2: Create mobile/features/accounts/AccountsScreen.tsx**

```tsx
import { useRef } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi, formatCurrency } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { CreateAccountSheet } from './CreateAccountSheet'
import { AccountEditSheet } from './AccountEditSheet'
import type { AccountResponse } from '@xnoll/shared'
import { useState } from 'react'

export function AccountsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const createRef = useRef<BottomSheet>(null)
  const editRef = useRef<BottomSheet>(null)
  const [selected, setSelected] = useState<AccountResponse | null>(null)

  const { data: accounts = [], isLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  const totalRUB = accounts.filter(a => a.currency === 'RUB').reduce((s, a) => s + parseFloat(a.balance), 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => qc.invalidateQueries({ queryKey: ['accounts'] })} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Счета</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accentTint }]}
            onPress={() => createRef.current?.expand()}
          >
            <Plus size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Итого (RUB)</Text>
          <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{formatCurrency(totalRUB, 'RUB')}</Text>
        </View>

        {accounts.map(account => (
          <TouchableOpacity
            key={account.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setSelected(account); editRef.current?.expand() }}
          >
            <View>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{account.name}</Text>
              {account.bank_name ? <Text style={[styles.cardBank, { color: colors.textMuted }]}>{account.bank_name}</Text> : null}
            </View>
            <Text style={[styles.cardBalance, { color: colors.accent }]}>
              {formatCurrency(parseFloat(account.balance), account.currency)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <CreateAccountSheet ref={createRef} onCreated={() => { qc.invalidateQueries({ queryKey: ['accounts'] }); createRef.current?.close() }} />
      {selected && (
        <AccountEditSheet
          ref={editRef}
          account={selected}
          onUpdated={() => { qc.invalidateQueries({ queryKey: ['accounts'] }); editRef.current?.close() }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 26, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardBank: { fontSize: 12, marginTop: 2 },
  cardBalance: { fontSize: 18, fontWeight: '700' },
})
```

- [ ] **Step 3: Create mobile/features/accounts/CreateAccountSheet.tsx**

```tsx
import { forwardRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { Sheet } from '../../components/Sheet'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']

interface Props { onCreated: () => void }

export const CreateAccountSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const colors = useTheme()
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [balance, setBalance] = useState('0')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name) { setError('Введите название'); return }
    setLoading(true)
    setError(null)
    try {
      await accountsApi.create({ name, bank_name: bank, currency, balance })
      setName(''); setBank(''); setBalance('0'); setCurrency('RUB')
      onCreated()
    } catch { setError('Ошибка создания счёта') }
    finally { setLoading(false) }
  }

  return (
    <Sheet ref={ref} snapPoints={['55%']}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Новый счёт</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Банк (необязательно)" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Начальный баланс" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
      <View style={styles.row}>
        {CURRENCIES.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, { borderColor: currency === c ? colors.accent : colors.border, backgroundColor: currency === c ? colors.accentTint : colors.surface2 }]} onPress={() => setCurrency(c)}>
            <Text style={{ color: currency === c ? colors.accent : colors.textSecondary, fontWeight: '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Создать</Text>}
      </TouchableOpacity>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#f87171', fontSize: 13, marginBottom: 8 },
})
```

- [ ] **Step 4: Create mobile/features/accounts/AccountEditSheet.tsx**

```tsx
import { forwardRef, useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { accountsApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { Sheet } from '../../components/Sheet'
import type { AccountResponse } from '@xnoll/shared'

interface Props { account: AccountResponse; onUpdated: () => void }

export const AccountEditSheet = forwardRef<BottomSheet, Props>(({ account, onUpdated }, ref) => {
  const colors = useTheme()
  const [name, setName] = useState(account.name)
  const [bank, setBank] = useState(account.bank_name)
  const [balance, setBalance] = useState(account.balance)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setName(account.name); setBank(account.bank_name); setBalance(account.balance) }, [account])

  async function handleUpdate() {
    setLoading(true)
    try {
      await accountsApi.update(account.id, { name, bank_name: bank, balance })
      onUpdated()
    } catch {} finally { setLoading(false) }
  }

  function handleDelete() {
    Alert.alert('Удалить счёт', `Удалить "${account.name}"?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await accountsApi.delete(account.id)
        onUpdated()
      }},
    ])
  }

  return (
    <Sheet ref={ref} snapPoints={['55%']}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Редактировать счёт</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Название" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Банк" placeholderTextColor={colors.textMuted} value={bank} onChangeText={setBank} />
      <TextInput style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]} placeholder="Баланс" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Сохранить</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.expense }]} onPress={handleDelete}>
        <Text style={[styles.deleteText, { color: colors.expense }]}>Удалить счёт</Text>
      </TouchableOpacity>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 15, fontWeight: '600' },
})
```

- [ ] **Step 5: Update mobile/app/(tabs)/accounts.tsx**

```tsx
import { AccountsScreen } from '../../features/accounts/AccountsScreen'
export default function AccountsTab() {
  return <AccountsScreen />
}
```

- [ ] **Step 6: Test in Expo Go**

Navigate to Accounts tab. Expected: list of accounts with balances, + button opens create sheet, tapping account opens edit sheet, delete shows confirmation alert.

- [ ] **Step 7: Commit**

```bash
git add mobile/features/accounts/ mobile/components/Sheet.tsx mobile/app/(tabs)/accounts.tsx
git commit -m "feat(mobile): add Accounts screen with create/edit bottom sheets"
```

---

## Task 9: Transactions — AddTx + detail + all-transactions sheets

**Files:**
- Create: `mobile/features/transactions/AddTxSheet.tsx`
- Create: `mobile/features/transactions/TransactionDetailSheet.tsx`
- Create: `mobile/features/transactions/AllTransactionsSheet.tsx`
- Create: `mobile/components/SheetManager.tsx`
- Create: `mobile/components/Toast.tsx`

- [ ] **Step 1: Create mobile/components/Toast.tsx**

```tsx
import { useEffect } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUIStore } from '../store/ui'
import { useTheme } from '../theme/ThemeProvider'

export function Toast() {
  const colors = useTheme()
  const toast = useUIStore((s) => s.toast)
  const dismiss = useUIStore((s) => s.dismissToast)
  const opacity = new Animated.Value(0)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!toast) return
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => dismiss())
  }, [toast])

  if (!toast) return null

  return (
    <Animated.View style={[styles.toast, { backgroundColor: toast.color, bottom: insets.bottom + 90, opacity }]}>
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, borderRadius: 12, padding: 14, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
```

- [ ] **Step 2: Create mobile/features/transactions/AddTxSheet.tsx**

```tsx
import { forwardRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import { Sheet } from '../../components/Sheet'
import type { TransactionType, CategoryResponse } from '@xnoll/shared'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

interface Props { onCreated?: () => void }

export const AddTxSheet = forwardRef<BottomSheet, Props>(({ onCreated }, ref) => {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const flatCats = flatten(categories).filter(c => c.type === type && !c.children?.length)

  async function handleCreate() {
    if (!amount || !accountId || !categoryId) { showToast('Заполните все поля', '#f87171'); return }
    setLoading(true)
    try {
      await transactionsApi.create({ account_id: accountId, category_id: categoryId, type, amount, date, description: description || undefined })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      showToast('Транзакция добавлена', '#34d399')
      setAmount(''); setDescription(''); setCategoryId(null)
      onCreated?.()
    } catch { showToast('Ошибка', '#f87171') }
    finally { setLoading(false) }
  }

  return (
    <Sheet ref={ref} snapPoints={['80%', '95%']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Новая транзакция</Text>

        {/* Type toggle */}
        <View style={[styles.toggle, { backgroundColor: colors.surface2 }]}>
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, type === t && { backgroundColor: t === 'income' ? colors.income : colors.expense }]}
              onPress={() => { setType(t); setCategoryId(null) }}
            >
              <Text style={[styles.toggleText, { color: type === t ? '#fff' : colors.textMuted }]}>
                {t === 'income' ? 'Доход' : 'Расход'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Сумма"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Счёт</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {accounts.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.chip, { borderColor: accountId === a.id ? colors.accent : colors.border, backgroundColor: accountId === a.id ? colors.accentTint : colors.surface2 }]}
              onPress={() => setAccountId(a.id)}
            >
              <Text style={{ color: accountId === a.id ? colors.accent : colors.textSecondary, fontSize: 13 }}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textMuted }]}>Категория</Text>
        <View style={styles.catGrid}>
          {flatCats.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, { borderColor: categoryId === c.id ? colors.accent : colors.border, backgroundColor: categoryId === c.id ? colors.accentTint : colors.surface2 }]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={[styles.catLabel, { color: categoryId === c.id ? colors.accent : colors.textSecondary }]} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Описание (необязательно)"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface2, color: colors.textPrimary }]}
          placeholder="Дата (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          value={date}
          onChangeText={setDate}
        />

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Добавить</Text>}
        </TouchableOpacity>
      </ScrollView>
    </Sheet>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 14 },
  toggleBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontWeight: '600', fontSize: 14 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  chips: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 10, borderWidth: 1.5 },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 12, fontWeight: '500', maxWidth: 80 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 3: Create mobile/components/SheetManager.tsx**

Central component that renders all sheets based on UIStore modal state. Add it once inside `_layout.tsx`.

```tsx
import { useRef } from 'react'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { AddTxSheet } from '../features/transactions/AddTxSheet'

export function SheetManager() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)
  const addTxRef = useRef<BottomSheet>(null)

  // Open/close sheets reactively
  if (modal.type === 'add-tx' && addTxRef.current?.snapToIndex) {
    addTxRef.current.snapToIndex(0)
  }

  return (
    <>
      <AddTxSheet ref={addTxRef} onCreated={closeModal} />
    </>
  )
}
```

> Note: In React, calling imperative methods in render is not ideal. A better pattern uses `useEffect` — update this in Task 10 if it causes issues:

```tsx
import { useRef, useEffect } from 'react'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { AddTxSheet } from '../features/transactions/AddTxSheet'

export function SheetManager() {
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)
  const addTxRef = useRef<BottomSheet>(null)

  useEffect(() => {
    if (modal.type === 'add-tx') addTxRef.current?.expand()
    else addTxRef.current?.close()
  }, [modal.type])

  return <AddTxSheet ref={addTxRef} onCreated={closeModal} />
}
```

- [ ] **Step 4: Add SheetManager and Toast to mobile/app/_layout.tsx**

Import and render inside the ThemeProvider, after `<Stack>`:

```tsx
import { SheetManager } from '../components/SheetManager'
import { Toast } from '../components/Toast'

// Inside RootLayout return, after <Stack>:
<SheetManager />
<Toast />
```

- [ ] **Step 5: Test AddTx flow in Expo Go**

Press the + button in the bottom nav. Expected: AddTxSheet slides up. Select account, category, enter amount, press Add. Expected: toast "Транзакция добавлена", sheet closes, Home screen transaction list updates.

- [ ] **Step 6: Create mobile/features/transactions/TransactionDetailSheet.tsx**

```tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, formatAmount, formatDate } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore } from '../../store/ui'
import type { TransactionResponse } from '@xnoll/shared'

interface Props { transaction: TransactionResponse; onClose: () => void }

export function TransactionDetail({ transaction: tx, onClose }: Props) {
  const colors = useTheme()
  const qc = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)
  const isIncome = tx.type === 'income'

  async function handleDelete() {
    Alert.alert('Удалить транзакцию', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await transactionsApi.delete(tx.id)
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['accounts'] })
        qc.invalidateQueries({ queryKey: ['stats'] })
        showToast('Транзакция удалена', '#6366f1')
        onClose()
      }},
    ])
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+' : '-'}{formatAmount(parseFloat(tx.amount))} ₽
      </Text>
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Дата</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{formatDate(tx.date)}</Text>
      </View>
      {tx.description && (
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Описание</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{tx.description}</Text>
        </View>
      )}
      <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.expense }]} onPress={handleDelete}>
        <Text style={[styles.deleteTxt, { color: colors.expense }]}>Удалить транзакцию</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  amount: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
  deleteBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  deleteTxt: { fontWeight: '600', fontSize: 15 },
})
```

- [ ] **Step 7: Wire TransactionDetail into SheetManager**

Update `mobile/components/SheetManager.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import { View } from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { useUIStore } from '../store/ui'
import { AddTxSheet } from '../features/transactions/AddTxSheet'
import { TransactionDetail } from '../features/transactions/TransactionDetailSheet'
import { Sheet } from './Sheet'
import { useTheme } from '../theme/ThemeProvider'
import type { TransactionResponse } from '@xnoll/shared'

export function SheetManager() {
  const colors = useTheme()
  const modal = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)
  const addTxRef = useRef<BottomSheet>(null)
  const detailRef = useRef<BottomSheet>(null)

  useEffect(() => {
    if (modal.type === 'add-tx') addTxRef.current?.expand()
    else addTxRef.current?.close()
  }, [modal.type])

  useEffect(() => {
    if (modal.type === 'transaction-detail') detailRef.current?.expand()
    else detailRef.current?.close()
  }, [modal.type])

  return (
    <>
      <AddTxSheet ref={addTxRef} onCreated={closeModal} />
      <Sheet ref={detailRef} snapPoints={['45%']} onClose={closeModal}>
        {modal.type === 'transaction-detail' && modal.payload && (
          <TransactionDetail transaction={modal.payload as TransactionResponse} onClose={closeModal} />
        )}
      </Sheet>
    </>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add mobile/features/transactions/ mobile/components/SheetManager.tsx mobile/components/Toast.tsx
git commit -m "feat(mobile): add AddTx sheet, transaction detail, Toast"
```

---

## Task 10: Analytics screen

**Files:**
- Create: `mobile/features/analytics/useStats.ts`
- Create: `mobile/features/analytics/AnalyticsScreen.tsx`
- Modify: `mobile/app/(tabs)/analytics.tsx`

- [ ] **Step 1: Create mobile/features/analytics/useStats.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@xnoll/shared'
import type { StatPeriod, CustomRange } from '@xnoll/shared'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange) {
  const categories = useQuery({ queryKey: ['stats', 'categories', p], queryFn: () => statsApi.categories(p) })
  const timeline   = useQuery({ queryKey: ['stats', 'timeline', p],   queryFn: () => statsApi.timeline(p) })
  const accounts   = useQuery({ queryKey: ['stats', 'accounts', p],   queryFn: () => statsApi.accounts(p) })
  return { categories, timeline, accounts }
}
```

- [ ] **Step 2: Create mobile/features/analytics/AnalyticsScreen.tsx**

```tsx
import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { VictoryBar, VictoryChart, VictoryAxis, VictoryPie, VictoryTheme } from 'victory-native'
import { useStats } from './useStats'
import { formatAmount } from '@xnoll/shared'
import { useTheme } from '../../theme/ThemeProvider'
import type { StatPeriod } from '@xnoll/shared'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'day',        label: 'День' },
  { value: 'this_month', label: 'Месяц' },
  { value: 'prev_month', label: 'Прошлый' },
  { value: 'this_year',  label: 'Год' },
]

const PIE_COLORS = ['#6366f1','#ec4899','#34d399','#f59e0b','#06b6d4','#a855f7','#f87171','#10b981']

export function AnalyticsScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<StatPeriod>('this_month')

  const { categories, timeline } = useStats({ period })

  const expenseData = (categories.data?.expense_by_category ?? [])
    .map((c, i) => ({ x: c.category_name, y: Math.abs(parseFloat(c.amount)), fill: PIE_COLORS[i % PIE_COLORS.length] }))
    .filter(d => d.y > 0)

  const timelineData = (timeline.data?.periods ?? []).map(p => ({
    period: p.period.slice(-5),
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  }))

  const totalIncome  = parseFloat(categories.data?.total_income  ?? '0')
  const totalExpense = Math.abs(parseFloat(categories.data?.total_expense ?? '0'))
  const net = totalIncome - totalExpense

  const isLoading = categories.isLoading || timeline.isLoading

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120 }}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Аналитика</Text>

      {/* Period tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.tab, { backgroundColor: period === p.value ? colors.accent : colors.surface, borderColor: colors.border }]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={{ color: period === p.value ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

      {!isLoading && (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Доходы</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>{formatAmount(totalIncome)} ₽</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Расходы</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatAmount(totalExpense)} ₽</Text>
            </View>
          </View>
          <View style={[styles.netCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Чистый доход</Text>
            <Text style={[styles.summaryValue, { color: net >= 0 ? colors.income : colors.expense }]}>
              {net >= 0 ? '+' : ''}{formatAmount(net)} ₽
            </Text>
          </View>

          {/* Timeline bar chart */}
          {timelineData.length > 1 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Динамика</Text>
              <VictoryChart theme={VictoryTheme.material} height={200} padding={{ top: 10, bottom: 40, left: 50, right: 10 }}>
                <VictoryAxis style={{ tickLabels: { fill: colors.textMuted, fontSize: 10 }, grid: { stroke: 'transparent' }, axis: { stroke: colors.border } }} />
                <VictoryAxis dependentAxis style={{ tickLabels: { fill: colors.textMuted, fontSize: 10 }, grid: { stroke: colors.border }, axis: { stroke: 'transparent' } }} />
                <VictoryBar data={timelineData} x="period" y="income" style={{ data: { fill: colors.income } }} barRatio={0.4} />
                <VictoryBar data={timelineData} x="period" y="expense" style={{ data: { fill: colors.expense } }} barRatio={0.4} />
              </VictoryChart>
            </>
          )}

          {/* Expense pie chart */}
          {expenseData.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Расходы по категориям</Text>
              <VictoryPie
                data={expenseData}
                colorScale={expenseData.map(d => d.fill)}
                innerRadius={60}
                height={220}
                style={{ labels: { fill: colors.textSecondary, fontSize: 10 } }}
                labelRadius={90}
              />
              {expenseData.map((d, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: d.fill }]} />
                  <Text style={[styles.legendName, { color: colors.textSecondary }]}>{d.x}</Text>
                  <Text style={[styles.legendVal, { color: colors.textPrimary }]}>{formatAmount(d.y)} ₽</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  tabs: { marginBottom: 16 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  netCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4, marginBottom: 20 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14 },
  legendVal: { fontSize: 14, fontWeight: '600' },
})
```

- [ ] **Step 3: Update mobile/app/(tabs)/analytics.tsx**

```tsx
import { AnalyticsScreen } from '../../features/analytics/AnalyticsScreen'
export default function AnalyticsTab() {
  return <AnalyticsScreen />
}
```

- [ ] **Step 4: Test in Expo Go**

Navigate to Analytics tab. Expected: period tabs, summary cards with income/expense, bar chart, pie chart. Switching periods refreshes data.

- [ ] **Step 5: Commit**

```bash
git add mobile/features/analytics/ mobile/app/(tabs)/analytics.tsx
git commit -m "feat(mobile): add Analytics screen with victory-native charts"
```

---

## Task 11 (bonus): Profile screen + store submission prep

**Files:**
- Create: `mobile/features/profile/ProfileScreen.tsx`
- Modify: `mobile/app/(tabs)/profile.tsx`
- Modify: `mobile/app.json` (icons, splash)

- [ ] **Step 1: Create mobile/features/profile/ProfileScreen.tsx**

```tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { useTheme } from '../../theme/ThemeProvider'
import type { ThemeName, ThemeMode } from '../../theme/tokens'

const THEMES: { name: ThemeName; color: string; label: string }[] = [
  { name: 'violet', color: '#6366f1', label: 'Фиолетовый' },
  { name: 'teal',   color: '#14b8a6', label: 'Бирюзовый' },
  { name: 'amber',  color: '#f59e0b', label: 'Янтарь' },
  { name: 'rose',   color: '#e11d48', label: 'Роза' },
]

export function ProfileScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)

  async function changeTheme(name: ThemeName) {
    setTheme(name)
    await authApi.patchTheme({ theme_color: name }).catch(() => {})
  }

  async function changeMode(mode: ThemeMode) {
    setThemeMode(mode)
    await authApi.patchTheme({ theme_mode: mode }).catch(() => {})
  }

  function handleLogout() {
    Alert.alert('Выйти', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { qc.clear(); logout() } },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 24 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Профиль</Text>

        {/* User info */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.full_name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>

        {/* Theme color */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Цвет темы</Text>
          <View style={styles.themeRow}>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.name}
                style={[styles.themeDot, { backgroundColor: t.color, borderWidth: theme === t.name ? 3 : 0, borderColor: colors.textPrimary }]}
                onPress={() => changeTheme(t.name)}
              />
            ))}
          </View>
        </View>

        {/* Theme mode */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Режим</Text>
          <View style={[styles.toggle, { backgroundColor: colors.surface2 }]}>
            {(['dark', 'light'] as ThemeMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, themeMode === m && { backgroundColor: colors.accent }]}
                onPress={() => changeMode(m)}
              >
                <Text style={{ color: themeMode === m ? '#fff' : colors.textMuted, fontWeight: '600' }}>
                  {m === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.expense }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.expense }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  themeRow: { flexDirection: 'row', gap: 14 },
  themeDot: { width: 36, height: 36, borderRadius: 18 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { height: 50, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontWeight: '600', fontSize: 15 },
})
```

- [ ] **Step 2: Update mobile/app/(tabs)/profile.tsx**

```tsx
import { ProfileScreen } from '../../features/profile/ProfileScreen'
export default function ProfileTab() {
  return <ProfileScreen />
}
```

- [ ] **Step 3: Add app icons and splash to app.json**

Add your app icon (1024×1024 PNG) at `mobile/assets/icon.png` and splash screen at `mobile/assets/splash.png`. Update `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#12151f"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.xnoll.app",
      "icon": "./assets/icon.png"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#12151f"
      },
      "package": "com.xnoll.app"
    }
  }
}
```

- [ ] **Step 4: Install EAS CLI and configure build**

```bash
npm install -g eas-cli
cd mobile && eas login
eas build:configure
```

This generates `eas.json`. Update it:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 5: Test full flow in Expo Go**

Walk through the complete user journey:
1. Launch app → Login screen
2. Login → Home screen shows balance, accounts, transactions
3. Tap + → AddTx sheet, create income and expense
4. Navigate to Accounts → see accounts, create one, edit one
5. Navigate to Analytics → see charts updating
6. Navigate to Profile → change theme color, toggle dark/light, verify theme applies immediately
7. Logout → returns to Login

- [ ] **Step 6: Final commit**

```bash
git add mobile/features/profile/ mobile/app/(tabs)/profile.tsx mobile/app.json mobile/eas.json
git commit -m "feat(mobile): Profile screen, theme switching, EAS build config"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Shared package with API endpoints extracted
- ✅ Expo SDK 52 + expo-router v4
- ✅ ThemeContext with 4 themes × 2 modes
- ✅ expo-secure-store for JWT tokens
- ✅ expo-router file-based navigation with auth guard
- ✅ Login + Register screens
- ✅ Home screen with balance, accounts strip, transaction history
- ✅ Accounts screen with create/edit bottom sheets
- ✅ AddTx sheet wired to BottomNav + button
- ✅ TransactionDetail sheet
- ✅ Analytics with victory-native (bar chart + pie chart)
- ✅ Profile with theme switching + logout
- ✅ EAS build config for store submission

**Known limitations to address during implementation:**
- `SheetManager` pattern with `useEffect` imperative calls is functional but can have race conditions when modals switch rapidly. Acceptable for v1.
- Transfer and Deposit sheets are not implemented in this plan (they follow the same pattern as `CreateAccountSheet`). Add them after the core flow works, reusing the `Sheet` component wrapper.
- `victory-native` may require additional setup for react-native-svg on some Expo SDK versions — run `npx expo install react-native-svg` if charts show blank.
