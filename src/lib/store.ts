'use client'

import { create } from 'zustand'

export type ViewKey =
  | 'dashboard'
  | 'search'
  | 'library'
  | 'feeds'
  | 'digests'
  | 'channels'
  | 'broadcasts'
  | 'telegram'
  | 'settings'

interface AppState {
  view: ViewKey
  setView: (v: ViewKey) => void
  activeDigestId: string | null
  openDigest: (id: string) => void
  clearActiveDigest: () => void
  activeArticleId: string | null
  openArticle: (id: string) => void
  clearActiveArticle: () => void
  toastQueue: string[]
  pushToast: (msg: string) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v }),
  activeDigestId: null,
  openDigest: (id) => set({ activeDigestId: id, view: 'digests' }),
  clearActiveDigest: () => set({ activeDigestId: null }),
  activeArticleId: null,
  openArticle: (id) => set({ activeArticleId: id, view: 'library' }),
  clearActiveArticle: () => set({ activeArticleId: null }),
  toastQueue: [],
  pushToast: (msg) => set((s) => ({ toastQueue: [...s.toastQueue, msg] })),
}))
