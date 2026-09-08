import type { GameSpec, Genre, Shape, Behavior, GoalKind, Palette } from '../types'

const GENRES: Genre[] = [
  'collector',
  'shooter',
  'dodge',
  'snake',
  'breakout',
  'platformer',
  'survive',
]
const SHAPES: Shape[] = ['square', 'circle', 'triangle', 'ship', 'diamond']
const BEHAVIORS: Behavior[] = ['chase', 'drift', 'bounce', 'swoop']
const GOALS: GoalKind[] = ['score', 'survive', 'collect', 'clear']

export function cartBytes(spec: GameSpec): number {
  return new TextEncoder().encode(JSON.stringify(spec)).length
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'cart'
}

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function gzipBytes(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzipBytes(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export async function encodeCart(spec: GameSpec): Promise<string> {
  const json = JSON.stringify(spec)
  try {
    const compressed = await gzipBytes(json)
    return `z.${bytesToB64Url(compressed)}`
  } catch {
    return `r.${bytesToB64Url(new TextEncoder().encode(json))}`
  }
}

export async function decodeCart(payload: string): Promise<GameSpec> {
  const raw = payload.trim()
  const body = raw.startsWith('z.') || raw.startsWith('r.') ? raw.slice(2) : raw
  const bytes = b64UrlToBytes(body)
  let json: string
  if (raw.startsWith('r.')) {
    json = new TextDecoder().decode(bytes)
  } else {
    try {
      json = await gunzipBytes(bytes)
    } catch {
      json = new TextDecoder().decode(bytes)
    }
  }
  return parseCartJson(json)
}

export function parseCartJson(text: string): GameSpec {
  const parsed: unknown = JSON.parse(text)
  if (!isGameSpec(parsed)) throw new Error('That file is not a Kilobyte cart.')
  return parsed
}

export function shareUrl(payload: string): string {
  const origin = typeof location === 'undefined' ? '' : location.origin + location.pathname
  return `${origin}#/c/${payload}`
}

export function isGameSpec(value: unknown): value is GameSpec {
  if (!value || typeof value !== 'object') return false
  const spec = value as GameSpec
  return (
    spec.v === 1 &&
    typeof spec.id === 'string' &&
    typeof spec.title === 'string' &&
    typeof spec.author === 'string' &&
    typeof spec.prompt === 'string' &&
    typeof spec.blurb === 'string' &&
    typeof spec.createdAt === 'string' &&
    GENRES.includes(spec.genre) &&
    typeof spec.theme === 'string' &&
    typeof spec.seed === 'number' &&
    isPalette(spec.palette) &&
    spec.player &&
    SHAPES.includes(spec.player.shape) &&
    Number.isFinite(spec.player.speed) &&
    Number.isFinite(spec.player.size) &&
    Number.isFinite(spec.player.hp) &&
    spec.world &&
    typeof spec.world.wrap === 'boolean' &&
    Number.isFinite(spec.world.gravity) &&
    typeof spec.world.stars === 'boolean' &&
    spec.goal &&
    GOALS.includes(spec.goal.kind) &&
    Number.isFinite(spec.goal.target) &&
    Number.isFinite(spec.goal.seconds) &&
    spec.swarm &&
    Number.isFinite(spec.swarm.count) &&
    Number.isFinite(spec.swarm.speed) &&
    BEHAVIORS.includes(spec.swarm.behavior) &&
    spec.loot &&
    Number.isFinite(spec.loot.count) &&
    Number.isFinite(spec.loot.value)
  )
}

function isPalette(value: unknown): value is Palette {
  if (!value || typeof value !== 'object') return false
  const p = value as Palette
  return [p.bg, p.paper, p.accent, p.player, p.enemy, p.loot].every(
    (c) => typeof c === 'string' && /^#([0-9a-fA-F]{6})$/.test(c),
  )
}
