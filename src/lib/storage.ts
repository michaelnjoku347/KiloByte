import type { ArcadeSettings, ArcadeState, GameSpec } from '../types'
import { HOUSE_CARTS } from '../data/house'
import { cartBytes } from './cart'

export const STORAGE_KEY = 'kilobyte.arcade.v1'

export const DEFAULT_SETTINGS: ArcadeSettings = {
  author: 'Anonymous',
  geminiKey: '',
}

export function emptyState(): ArcadeState {
  return { carts: [], settings: DEFAULT_SETTINGS }
}

export function loadState(): ArcadeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<ArcadeState>
    return {
      carts: Array.isArray(parsed.carts) ? parsed.carts.filter((c) => c && c.v === 1) : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        author: parsed.settings?.author?.trim() || DEFAULT_SETTINGS.author,
        geminiKey: parsed.settings?.geminiKey ?? '',
      },
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: ArcadeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function publishedCarts(state: ArcadeState): GameSpec[] {
  const seen = new Set<string>()
  const out: GameSpec[] = []
  for (const cart of [...HOUSE_CARTS, ...state.carts]) {
    if (seen.has(cart.id)) continue
    seen.add(cart.id)
    out.push(cart)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function arcadeWeight(carts: GameSpec[]): number {
  return carts.reduce((sum, cart) => sum + cartBytes(cart), 0)
}

export function upsertCart(carts: GameSpec[], cart: GameSpec): GameSpec[] {
  const idx = carts.findIndex((c) => c.id === cart.id)
  if (idx === -1) return [...carts, { ...cart, house: false }]
  const next = [...carts]
  next[idx] = { ...cart, house: false }
  return next
}
