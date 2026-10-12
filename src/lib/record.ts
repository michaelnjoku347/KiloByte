import type { GameRecord, GameSpec, GameSource, SourceFilter } from '../types'
import { publicUrl } from './base'
import { cartBytes } from './cart'
import { ENGINE_GENRE_MAP } from './genres'

export function recordFromCart(spec: GameSpec): GameRecord {
  return {
    id: spec.id,
    title: spec.title,
    author: spec.author,
    blurb: spec.blurb,
    description: spec.prompt
      ? `${spec.blurb}\n\nMinted from: “${spec.prompt}”`
      : spec.blurb,
    genres: ENGINE_GENRE_MAP[spec.genre] ?? ['Arcade'],
    createdAt: spec.createdAt,
    cover: spec.palette.accent,
    palette: {
      bg: spec.palette.bg,
      paper: spec.palette.paper,
      accent: spec.palette.accent,
    },
    house: spec.house,
    bytes: cartBytes(spec),
    rating: 0,
    source: { kind: 'cart', spec },
  }
}

export function sourceKind(source: GameSource): SourceFilter {
  if (source.kind === 'github') return 'github'
  if (source.kind === 'upload') return 'upload'
  if (source.kind === 'html' || source.kind === 'wasm') return 'house'
  return 'cart'
}

export function runtimeOf(game: GameRecord): 'html' | 'wasm' | 'cart' | 'github' | 'upload' {
  switch (game.source.kind) {
    case 'wasm':
      return 'wasm'
    case 'html':
      return 'html'
    case 'cart':
      return 'cart'
    case 'github':
      return 'github'
    case 'upload':
      return 'upload'
  }
}

export function runtimeLabel(game: GameRecord): string {
  switch (runtimeOf(game)) {
    case 'wasm':
      return 'WebAssembly'
    case 'html':
      return 'HTML'
    case 'cart':
      return 'Cart'
    case 'github':
      return 'GitHub'
    case 'upload':
      return 'Upload'
  }
}

export function sourceLabel(source: GameSource): string {
  switch (source.kind) {
    case 'github':
      return `${source.owner}/${source.repo}`
    case 'upload':
      return 'Uploaded build'
    case 'html':
      return 'On-site build'
    case 'wasm':
      return 'WebAssembly'
    default:
      return 'JSON cart'
  }
}

export function playUrlFor(game: GameRecord): string | undefined {
  const { source } = game
  if (source.kind === 'github') return source.playUrl
  if (source.kind === 'html' || source.kind === 'wasm') return source.href
  if (source.kind === 'upload') return publicUrl(`local-game/${encodeURIComponent(game.id)}/${source.entry}`)
  return undefined
}

export function recordBytes(game: GameRecord): number {
  return game.bytes
}
