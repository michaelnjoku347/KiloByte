import type { Behavior, GameSpec, Genre, GoalKind, Palette, Shape } from '../types'
import { hashString, mulberry32, pick, uid } from './hash'

const GENRE_HINTS: { genre: Genre; words: string[] }[] = [
  { genre: 'snake', words: ['snake', 'worm', 'nibble', 'coil', 'slither', 'naga'] },
  { genre: 'breakout', words: ['breakout', 'brick', 'pong', 'paddle', 'arkanoid', 'wall'] },
  { genre: 'platformer', words: ['platform', 'jump', 'leap', 'castle', 'side scroll', 'rooftop'] },
  {
    genre: 'shooter',
    words: ['shoot', 'invader', 'blaster', 'laser', 'ship', 'galaxy', 'alien', 'space war'],
  },
  { genre: 'dodge', words: ['dodge', 'rain', 'avoid', 'meteor', 'falling', 'dash', 'hail'] },
  { genre: 'survive', words: ['survive', 'horde', 'zombie', 'wave', 'endless', 'last stand'] },
  { genre: 'collector', words: ['collect', 'coin', 'gem', 'candy', 'loot', 'gather', 'orb'] },
]

const THEME_HINTS: { theme: string; words: string[] }[] = [
  { theme: 'space', words: ['space', 'star', 'galaxy', 'alien', 'comet', 'orbit', 'nebula'] },
  { theme: 'ocean', words: ['ocean', 'sea', 'fish', 'coral', 'tide', 'shark', 'kelp'] },
  { theme: 'dungeon', words: ['dungeon', 'castle', 'skull', 'ghost', 'crypt', 'knight'] },
  { theme: 'candy', words: ['candy', 'sugar', 'sweet', 'gum', 'chocolate', 'lollipop'] },
  { theme: 'neon', words: ['neon', 'cyber', 'synth', 'arcade', 'glitch', 'vhs'] },
  { theme: 'forest', words: ['forest', 'moss', 'leaf', 'owl', 'grove', 'mushroom'] },
  { theme: 'desert', words: ['desert', 'sand', 'cactus', 'dune', 'sun'] },
  { theme: 'lab', words: ['lab', 'atom', 'robot', 'circuit', 'science', 'virus'] },
]

const PALETTES: Record<string, Palette[]> = {
  space: [
    { bg: '#0b1020', paper: '#d7e0ff', accent: '#7cf0ff', player: '#f4d35e', enemy: '#ff5d73', loot: '#b6f27c' },
    { bg: '#12081c', paper: '#f2e6ff', accent: '#c084fc', player: '#ffe066', enemy: '#fb7185', loot: '#67e8f9' },
  ],
  ocean: [
    { bg: '#062a32', paper: '#d8f3f0', accent: '#2ec4b6', player: '#ffd166', enemy: '#e76f51', loot: '#8ecae6' },
    { bg: '#0a2438', paper: '#e7f6ff', accent: '#4cc9f0', player: '#f4a261', enemy: '#ef476f', loot: '#90e0ef' },
  ],
  dungeon: [
    { bg: '#1b1410', paper: '#f0e4d0', accent: '#c45c26', player: '#e9d8a6', enemy: '#9b2226', loot: '#ee9b00' },
    { bg: '#201616', paper: '#efe6d6', accent: '#bb9457', player: '#ffe8d6', enemy: '#6a040f', loot: '#f4d35e' },
  ],
  candy: [
    { bg: '#3b1024', paper: '#ffe5f1', accent: '#ff7eb6', player: '#fff1a8', enemy: '#7b2cbf', loot: '#80ed99' },
    { bg: '#2a1030', paper: '#ffe8f5', accent: '#ff8fab', player: '#ffd6a5', enemy: '#c77dff', loot: '#bde0fe' },
  ],
  neon: [
    { bg: '#101014', paper: '#f4f1ea', accent: '#ff5a36', player: '#c8f25a', enemy: '#ff2d95', loot: '#7cf0ff' },
    { bg: '#140f16', paper: '#f7f0e6', accent: '#ffb703', player: '#8ac926', enemy: '#ff006e', loot: '#00f5d4' },
  ],
  forest: [
    { bg: '#122116', paper: '#e7f0d8', accent: '#74a12e', player: '#f4e3b2', enemy: '#9c2d2d', loot: '#f2c14e' },
    { bg: '#14201b', paper: '#eef6e3', accent: '#52b788', player: '#ffe8a3', enemy: '#bc4749', loot: '#95d5b2' },
  ],
  desert: [
    { bg: '#2a1d12', paper: '#f8ecd4', accent: '#e07a3d', player: '#ffe1a8', enemy: '#9b2226', loot: '#90be6d' },
    { bg: '#24180f', paper: '#f6e7c1', accent: '#dda15e', player: '#fefae0', enemy: '#bc6c25', loot: '#606c38' },
  ],
  lab: [
    { bg: '#10161c', paper: '#e8f4f2', accent: '#2a9d8f', player: '#e9c46a', enemy: '#e76f51', loot: '#8ecae6' },
    { bg: '#12151c', paper: '#eef2ff', accent: '#4cc9f0', player: '#f4d35e', enemy: '#f72585', loot: '#b8f2e6' },
  ],
}

const NOUNS: Record<string, string[]> = {
  space: ['Comet', 'Orbit', 'Quasar', 'Drifter', 'Nibs'],
  ocean: ['Tide', 'Kelp', 'Pearl', 'Riptide', 'Buoy'],
  dungeon: ['Crypt', 'Relic', 'Lantern', 'Keep', 'Marrow'],
  candy: ['Chew', 'Fizz', 'Gumdrop', 'Syrup', 'Nougat'],
  neon: ['Signal', 'Static', 'Cabinet', 'Glitch', 'Ticket'],
  forest: ['Moss', 'Grove', 'Spore', 'Hollow', 'Acorn'],
  desert: ['Dune', 'Mirage', 'Cinder', 'Oasis', 'Clay'],
  lab: ['Ion', 'Beaker', 'Spark', 'Circuit', 'Sample'],
}

const ADJECTIVES = ['Tiny', 'Rusty', 'Lucky', 'Midnight', 'Bitter', 'Bright', 'Hollow', 'Rapid']

const SHAPES: Shape[] = ['square', 'circle', 'triangle', 'ship', 'diamond']
const BEHAVIORS: Behavior[] = ['chase', 'drift', 'bounce', 'swoop']

export type CompileInput = {
  prompt: string
  author: string
  id?: string
  seed?: number
  house?: boolean
  title?: string
  blurb?: string
  createdAt?: string
}

export function detectGenre(prompt: string): Genre {
  const p = prompt.toLowerCase()
  for (const hint of GENRE_HINTS) {
    if (hint.words.some((w) => p.includes(w))) return hint.genre
  }
  const hashed = hashString(p) % 7
  return GENRE_HINTS[hashed]?.genre ?? 'collector'
}

export function detectTheme(prompt: string): string {
  const p = prompt.toLowerCase()
  for (const hint of THEME_HINTS) {
    if (hint.words.some((w) => p.includes(w))) return hint.theme
  }
  return THEME_HINTS[hashString(p) % THEME_HINTS.length]?.theme ?? 'neon'
}

function defaultGoal(genre: Genre): { kind: GoalKind; target: number; seconds: number } {
  switch (genre) {
    case 'snake':
      return { kind: 'score', target: 12, seconds: 0 }
    case 'breakout':
      return { kind: 'clear', target: 1, seconds: 0 }
    case 'platformer':
      return { kind: 'collect', target: 8, seconds: 90 }
    case 'shooter':
      return { kind: 'score', target: 20, seconds: 0 }
    case 'dodge':
      return { kind: 'survive', target: 45, seconds: 45 }
    case 'survive':
      return { kind: 'survive', target: 40, seconds: 40 }
    default:
      return { kind: 'collect', target: 10, seconds: 60 }
  }
}

function quotedTitle(prompt: string): string | undefined {
  const match = prompt.match(/["“](.+?)["”]/)
  return match?.[1]?.trim() || undefined
}

export function compileCart(input: CompileInput): GameSpec {
  const prompt = input.prompt.trim() || 'a tiny arcade game'
  const seed = input.seed ?? hashString(`${prompt}|${input.author}|${input.createdAt ?? ''}`)
  const rand = mulberry32(seed)
  const genre = detectGenre(prompt)
  const theme = detectTheme(prompt)
  const palettes = PALETTES[theme] ?? PALETTES.neon
  const palette = palettes[Math.floor(rand() * palettes.length)] ?? palettes[0]
  const goal = defaultGoal(genre)
  const title =
    input.title?.trim() ||
    quotedTitle(prompt) ||
    `${pick(rand, ADJECTIVES)} ${pick(rand, NOUNS[theme] ?? NOUNS.neon)}`

  const speedBase = 2.2 + rand() * 1.8
  const swarmCount =
    genre === 'breakout' ? 0 : genre === 'snake' ? 0 : 3 + Math.floor(rand() * 5)

  return {
    v: 1,
    id: input.id ?? uid('cart'),
    title,
    author: input.author.trim() || 'Anonymous',
    prompt,
    blurb:
      input.blurb?.trim() ||
      `A ${theme} ${genre} cart. ${goal.kind === 'survive' ? 'Stay alive.' : 'Beat the target.'}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    genre,
    theme,
    seed,
    house: input.house,
    palette,
    player: {
      shape: genre === 'shooter' ? 'ship' : pick(rand, SHAPES),
      speed: Number(speedBase.toFixed(2)),
      size: genre === 'snake' ? 16 : 14 + Math.floor(rand() * 8),
      hp: genre === 'dodge' || genre === 'survive' ? 1 : 3,
    },
    world: {
      wrap: genre === 'collector' || genre === 'snake' || genre === 'survive',
      gravity: genre === 'platformer' ? 0.55 : 0,
      stars: theme === 'space' || theme === 'neon' || rand() > 0.55,
    },
    goal: {
      ...goal,
      target: goal.target + Math.floor(rand() * 6),
    },
    swarm: {
      count: swarmCount,
      speed: Number((1.2 + rand() * 2.2).toFixed(2)),
      behavior: genre === 'dodge' ? 'swoop' : pick(rand, BEHAVIORS),
    },
    loot: {
      count: genre === 'shooter' || genre === 'dodge' ? 0 : 6 + Math.floor(rand() * 7),
      value: 1 + Math.floor(rand() * 3),
    },
  }
}

export function remixCart(spec: GameSpec, author: string): GameSpec {
  const seed = (spec.seed + 7919) >>> 0
  return compileCart({
    prompt: spec.prompt,
    author,
    seed,
    title: `${spec.title.replace(/ \(remix.*\)$/, '')} (remix)`,
    blurb: `Remixed from ${spec.title}. Same recipe, new seasoning.`,
  })
}

export function applyModelDraft(
  prompt: string,
  author: string,
  draft: Partial<GameSpec> & { title?: string },
): GameSpec {
  const base = compileCart({ prompt, author, title: draft.title, blurb: draft.blurb })
  return {
    ...base,
    ...('genre' in draft && draft.genre ? { genre: draft.genre } : {}),
    ...('theme' in draft && draft.theme ? { theme: String(draft.theme) } : {}),
    palette: draft.palette ?? base.palette,
    player: { ...base.player, ...draft.player },
    world: { ...base.world, ...draft.world },
    goal: { ...base.goal, ...draft.goal },
    swarm: { ...base.swarm, ...draft.swarm },
    loot: { ...base.loot, ...draft.loot },
  }
}
