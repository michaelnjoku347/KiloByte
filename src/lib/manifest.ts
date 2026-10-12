import type { GameRecord, WasmSource, HtmlSource } from '../types'
import manifestJson from '../../public/games/manifest.json'
import { publicUrl } from './base'

export type ManifestRuntime = 'html' | 'wasm'

export type ManifestEntry = {
  id: string
  title: string
  author: string
  blurb: string
  description: string
  mashup?: string
  genres: string[]
  createdAt: string
  cover: string
  palette: { bg: string; paper: string; accent: string }
  runtime: ManifestRuntime
  dir: string
  entry?: string
  rating?: number
  bytes?: number
  controls?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function gamesFromManifest(input: unknown): GameRecord[] {
  if (!isRecord(input) || !Array.isArray(input.games)) return []
  const out: GameRecord[] = []
  for (const item of input.games) {
    const game = parseEntry(item)
    if (game) out.push(game)
  }
  return out
}

export function parseEntry(item: unknown): GameRecord | undefined {
  if (!isRecord(item)) return undefined
  const id = str(item.id)
  const title = str(item.title)
  const author = str(item.author)
  const blurb = str(item.blurb)
  const description = str(item.description)
  const dir = str(item.dir)
  const createdAt = str(item.createdAt)
  const cover = str(item.cover)
  const runtime = item.runtime === 'wasm' || item.runtime === 'html' ? item.runtime : undefined
  if (!id || !title || !author || !blurb || !description || !dir || !createdAt || !cover || !runtime) {
    return undefined
  }
  if (!/^[a-z0-9_]+$/i.test(id)) return undefined
  if (!isRecord(item.palette)) return undefined
  const bg = str(item.palette.bg)
  const paper = str(item.palette.paper)
  const accent = str(item.palette.accent)
  if (!bg || !paper || !accent) return undefined
  const genres = Array.isArray(item.genres)
    ? item.genres.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
    : []
  const entry = str(item.entry) ?? 'index.html'
  const href = publicUrl(`games/${dir}/${entry}`)
  const source: HtmlSource | WasmSource =
    runtime === 'wasm'
      ? { kind: 'wasm', entry, href }
      : { kind: 'html', entry, href }
  const rating = typeof item.rating === 'number' && Number.isFinite(item.rating) ? item.rating : 0
  const bytes = typeof item.bytes === 'number' && Number.isFinite(item.bytes) ? item.bytes : 0
  return {
    id,
    title,
    author,
    blurb,
    description,
    mashup: str(item.mashup),
    controls: str(item.controls),
    genres: genres.length ? genres : ['Arcade'],
    createdAt,
    cover,
    palette: { bg, paper, accent },
    house: true,
    bytes,
    rating,
    source,
  }
}

export function manifestGames(): GameRecord[] {
  return gamesFromManifest(manifestJson)
}
