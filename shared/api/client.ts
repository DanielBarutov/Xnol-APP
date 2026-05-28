import axios from 'axios'

export interface ApiClientConfig {
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
