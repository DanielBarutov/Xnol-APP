import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ThemeName, ThemeMode } from '../theme/tokens'

export type ModalType =
  | 'add-tx'
  | 'transfer'
  | 'transfer-detail'
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
