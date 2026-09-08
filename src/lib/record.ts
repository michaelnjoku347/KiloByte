import type { GameRecord, GameSpec, GameSource, SourceFilter } from '../types'
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
    source: { kind: 'cart', spec },
  }
}

export function sourceKind(source: GameSource): SourceFilter {
  if (source.kind === 'github') return 'github'
  if (source.kind === 'upload') return 'upload'
  if (source.kind === 'html') return 'house'
  return 'cart'
}

export function sourceLabel(source: GameSource): string {
  switch (source.kind) {
    case 'github':
      return `${source.owner}/${source.repo}`
    case 'upload':
      return 'Uploaded build'
    case 'html':
      return 'On-site build'
    default:
      return 'JSON cart'
  }
}

export function playUrlFor(game: GameRecord): string | undefined {
  const { source } = game
  if (source.kind === 'github') return source.playUrl
  if (source.kind === 'html') return source.href
  if (source.kind === 'upload') return `/local-game/${encodeURIComponent(game.id)}/${source.entry}`
  return undefined
}

export function recordBytes(game: GameRecord): number {
  return game.bytes
}
