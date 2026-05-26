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
