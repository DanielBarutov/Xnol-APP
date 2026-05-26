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
