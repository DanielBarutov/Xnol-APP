import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../theme/ThemeProvider'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { initApiClient, authApi } from '@xnoll/shared'

// Called once at module evaluation time — before any component mounts
initApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  onLogout: () => useAuthStore.getState().logout(),
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AuthGuard() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const setUser = useAuthStore((s) => s.setUser)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!hasHydrated) return  // wait for SecureStore to rehydrate
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
