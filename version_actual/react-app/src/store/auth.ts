// ═══════════════════════════════════════════════════
// Auth store — PIN + onboarding state (Checkpoint B)
// isAuthenticated is SESSION-ONLY (not persisted) so
// users must authenticate on every app launch — correct
// behaviour for a finance app.
// Supabase auth replaces this in Checkpoint C.
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthState {
  // Persisted
  hasSeenOnboarding: boolean
  pin: string
  userName: string
  userInitial: string
  userEmail: string

  // Session-only (NOT persisted — always requires PIN on reload)
  isAuthenticated: boolean

  // Actions
  completeOnboarding: () => void
  authenticate:       (enteredPin: string) => boolean
  logout:             () => void
  setPin:             (pin: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Defaults ──────────────────────────────────
      hasSeenOnboarding: false,
      pin:               '1234',       // Demo PIN — replace with biometrics in C
      userName:          'Anthony',
      userInitial:       'A',
      userEmail:         'anthonymarte12@gmail.com',
      isAuthenticated:   false,

      // ── Actions ───────────────────────────────────
      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      authenticate: (enteredPin: string) => {
        const ok = enteredPin === get().pin
        if (ok) set({ isAuthenticated: true })
        return ok
      },

      logout: () => set({ isAuthenticated: false }),

      setPin: (pin: string) => set({ pin }),
    }),
    {
      name: 'mis-finanzas-auth',
      // isAuthenticated intentionally excluded → session-only
      partialize: (s) => ({
        hasSeenOnboarding: s.hasSeenOnboarding,
        pin:               s.pin,
        userName:          s.userName,
        userInitial:       s.userInitial,
        userEmail:         s.userEmail,
      }),
    },
  ),
)
