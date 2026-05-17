// ═══════════════════════════════════════════════════
// Auth store — Supabase session + PIN/onboarding state
// isAuthenticated is SESSION-ONLY (not persisted).
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SessionPayload {
  userId:      string
  householdId: string | null
  email:       string | null
  userName?:   string | null
}

export interface AuthState {
  // Persisted
  hasSeenOnboarding: boolean
  pin:               string
  userName:          string
  userInitial:       string
  userEmail:         string

  // Session-only (NOT persisted)
  isAuthenticated: boolean
  userId:          string | null
  householdId:     string | null

  // Actions
  completeOnboarding: () => void
  authenticate:       (enteredPin: string) => boolean
  logout:             () => void
  setPin:             (pin: string) => void
  setSession:         (payload: SessionPayload) => void
  clearSession:       () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Defaults ──────────────────────────────────
      hasSeenOnboarding: false,
      pin:               '1234',
      userName:          'Anthony',
      userInitial:       'A',
      userEmail:         'anthonymarte12@gmail.com',
      isAuthenticated:   false,
      userId:            null,
      householdId:       null,

      // ── Actions ───────────────────────────────────
      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      authenticate: (enteredPin: string) => {
        const ok = enteredPin === get().pin
        if (ok) set({ isAuthenticated: true })
        return ok
      },

      logout: () => set({ isAuthenticated: false, userId: null, householdId: null }),

      setPin: (pin: string) => set({ pin }),

      setSession: ({ userId, householdId, email, userName }: SessionPayload) =>
        set({
          isAuthenticated: true,
          userId,
          householdId,
          ...(email    ? { userEmail:   email    } : {}),
          ...(userName ? { userName, userInitial: userName[0].toUpperCase() } : {}),
        }),

      clearSession: () => set({ isAuthenticated: false, userId: null, householdId: null }),
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
