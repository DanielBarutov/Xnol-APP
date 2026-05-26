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
