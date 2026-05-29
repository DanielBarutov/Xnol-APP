import { useEffect } from 'react'
import { LogBox } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Sync failures are expected during offline/transient periods — suppress LogBox overlay
LogBox.ignoreLogs(['[Sync]'])
import { QueryClient, onlineManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { ThemeProvider } from '../theme/ThemeProvider'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { initApiClient, authApi } from '@xnoll/shared'
import { SheetManager } from '../components/SheetManager'
import { Toast } from '../components/Toast'
import { useMutationSync } from '../hooks/useMutationSync'

initApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  onLogout: () => useAuthStore.getState().logout(),
})

// Drive React Query's online state from NetInfo
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected)
  })
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — keep cache for offline use
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'xnoll-query-cache',
  throttleTime: 3000,
})

function MutationSync() {
  useMutationSync()
  return null
}

function AuthGuard() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const setUser = useAuthStore((s) => s.setUser)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!hasHydrated) return
    const inAuth = segments[0] === '(auth)'
    if (!accessToken && !inAuth) router.replace('/(auth)/login')
    else if (accessToken && inAuth) router.replace('/(tabs)/')
  }, [accessToken, segments, hasHydrated])

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
        >
          <ThemeProvider>
            <AuthGuard />
            <MutationSync />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
            <SheetManager />
            <Toast />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
