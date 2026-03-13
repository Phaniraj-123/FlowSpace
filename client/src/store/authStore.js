import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    token: null,
    login: (user, token) => set({ user, token }),
    logout: () => set({ user: null, token: null }),
    updateUser: (updates) => set(state => ({
      user: { ...state.user, ...updates }
    }))
  }),
  { name: 'flowspace-auth' }
))