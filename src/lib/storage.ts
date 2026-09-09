import type { ArcadeSettings, ArcadeState, GameRecord, GameSpec, UserProfile } from '../types'
import { HOUSE_CARTS } from '../data/house'
import { HOUSE_GAMES } from '../data/catalog'
import { recordFromCart } from './record'
import { parseTheme } from './theme'

export const STORAGE_KEY = 'kilobyte.arcade.v2'
export const LEGACY_KEY = 'kilobyte.arcade.v1'

export const DEFAULT_SETTINGS: ArcadeSettings = {
  author: 'Anonymous',
  geminiKey: '',
  githubToken: '',
  theme: 'light',
}

export function emptyState(): ArcadeState {
  return {
    games: [],
    settings: DEFAULT_SETTINGS,
    plays: {},
    recents: [],
    favorites: [],
    profile: null,
    signedIn: false,
  }
}

function readProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<UserProfile>
  if (typeof raw.handle !== 'string' || typeof raw.displayName !== 'string') return null
  return {
    handle: raw.handle,
    displayName: raw.displayName,
    bio: typeof raw.bio === 'string' ? raw.bio : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    salt: typeof raw.salt === 'string' ? raw.salt : undefined,
    hash: typeof raw.hash === 'string' ? raw.hash : undefined,
    githubLogin: typeof raw.githubLogin === 'string' ? raw.githubLogin : undefined,
  }
}

function migrateLegacy(): GameRecord[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { carts?: GameSpec[] }
    return Array.isArray(parsed.carts) ? parsed.carts.filter((c) => c?.v === 1).map(recordFromCart) : []
  } catch {
    return []
  }
}

export function loadState(): ArcadeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        games: migrateLegacy(),
        settings: DEFAULT_SETTINGS,
        plays: {},
        recents: [],
        favorites: [],
        profile: null,
        signedIn: false,
      }
    }
    const parsed = JSON.parse(raw) as Partial<ArcadeState> & { carts?: GameSpec[] }
    const fromV2 = Array.isArray(parsed.games) ? parsed.games : []
    const leftover = Array.isArray(parsed.carts)
      ? parsed.carts.filter((c) => c?.v === 1).map(recordFromCart)
      : []
    return {
      games: [...fromV2, ...leftover].filter((g) => g && g.id && g.source),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        author: parsed.settings?.author?.trim() || DEFAULT_SETTINGS.author,
        geminiKey: parsed.settings?.geminiKey ?? '',
        githubToken: parsed.settings?.githubToken ?? '',
        theme: parseTheme(parsed.settings?.theme),
      },
      plays: parsed.plays && typeof parsed.plays === 'object' ? parsed.plays : {},
      recents: Array.isArray(parsed.recents) ? parsed.recents.filter((id) => typeof id === 'string') : [],
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((id) => typeof id === 'string')
        : [],
      profile: readProfile(parsed.profile),
      signedIn: Boolean(parsed.signedIn && readProfile(parsed.profile)),
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: ArcadeState): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      games: state.games,
      settings: state.settings,
      plays: state.plays,
      recents: state.recents,
      favorites: state.favorites,
      profile: state.profile,
      signedIn: state.signedIn,
    }),
  )
}

export function houseLibrary(): GameRecord[] {
  return [...HOUSE_GAMES, ...HOUSE_CARTS.map(recordFromCart)]
}

export function publishedGames(state: ArcadeState): GameRecord[] {
  const seen = new Set<string>()
  const out: GameRecord[] = []
  for (const game of [...houseLibrary(), ...state.games]) {
    if (seen.has(game.id)) continue
    seen.add(game.id)
    out.push(game)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function upsertGame(games: GameRecord[], game: GameRecord): GameRecord[] {
  const next = { ...game, house: false }
  const idx = games.findIndex((g) => g.id === game.id)
  if (idx === -1) return [...games, next]
  const copy = [...games]
  copy[idx] = next
  return copy
}

export function localWeight(games: GameRecord[]): number {
  return games.reduce((sum, game) => {
    if (game.source.kind === 'github') return sum
    return sum + game.bytes
  }, 0)
}
