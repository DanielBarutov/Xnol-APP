import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initApiClient } from '@xnoll/shared'
import { useAuthStore } from './store/auth'
import './index.css'
import App from './App'

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
