import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeName } from '../shared/tokens'

type ModalType = 'add-tx' | 'transfer' | 'deposit-detail' | 'account-detail' | null

interface UIState {
  modal: { type: ModalType; payload?: unknown }
  toast: { message: string; color: string } | null
  theme: ThemeName
  balanceVisible: boolean
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  showToast: (message: string, color: string) => void
  dismissToast: () => void
  setTheme: (theme: ThemeName) => void
  toggleBalance: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modal: { type: null },
      toast: null,
      theme: 'violet',
      balanceVisible: true,
      openModal: (type, payload) => set({ modal: { type, payload } }),
      closeModal: () => set({ modal: { type: null } }),
      showToast: (message, color) => set({ toast: { message, color } }),
      dismissToast: () => set({ toast: null }),
      setTheme: (theme) => set({ theme }),
      toggleBalance: () => set((s) => ({ balanceVisible: !s.balanceVisible })),
    }),
    { name: 'xnoll-ui', partialize: (s) => ({ theme: s.theme, balanceVisible: s.balanceVisible }) },
  ),
)
