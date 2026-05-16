import { create } from 'zustand'

interface AppState {
  /** FAB overlay open */
  fabOpen: boolean
  setFabOpen: (v: boolean) => void

  /** Active bottom tab id */
  activeTab: string
  setActiveTab: (tab: string) => void

  /** Navigation direction for slide animation */
  navDirection: 'forward' | 'back'
  setNavDirection: (d: 'forward' | 'back') => void
}

export const useAppStore = create<AppState>((set) => ({
  fabOpen: false,
  setFabOpen: (v) => set({ fabOpen: v }),

  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  navDirection: 'forward',
  setNavDirection: (d) => set({ navDirection: d }),
}))
