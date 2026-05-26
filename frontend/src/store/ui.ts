import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeName } from '../shared/tokens'

type ModalType = 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | 'account-edit' | 'create-account' | 'create-deposit' | 'categories' | 'all-transactions' | null

interface UIState {
  modal: { type: ModalType; payload?: unknown }
  toast: { message: string; color: string } | null
  theme: ThemeName
  themeMode: 'dark' | 'light'
  balanceVisible: boolean
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  showToast: (message: string, color: string) => void
  dismissToast: () => void
  setTheme: (theme: ThemeName) => void
  setThemeMode: (mode: 'dark' | 'light') => void
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
    { name: 'xnoll-ui', partialize: (s) => ({ theme: s.theme, themeMode: s.themeMode, balanceVisible: s.balanceVisible }) },
  ),
)
