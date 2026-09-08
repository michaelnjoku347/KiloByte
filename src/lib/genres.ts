export const GENRE_CATALOG = [
  'Action',
  'Adventure',
  'Arcade',
  'Card',
  'Casual',
  'Educational',
  'Horror',
  'Idle',
  'Platformer',
  'Puzzle',
  'Racing',
  'Rhythm',
  'RPG',
  'Roguelike',
  'Shooter',
  'Simulator',
  'Sports',
  'Strategy',
  'Survival',
  'Tycoon',
] as const

export const ENGINE_GENRE_MAP: Record<string, string[]> = {
  collector: ['Arcade', 'Casual'],
  shooter: ['Shooter', 'Action'],
  dodge: ['Action', 'Arcade'],
  snake: ['Arcade', 'Casual'],
  breakout: ['Arcade', 'Puzzle'],
  platformer: ['Platformer', 'Adventure'],
  survive: ['Survival', 'Action'],
}

export function normalizeGenre(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = GENRE_CATALOG.find((g) => g.toLowerCase() === trimmed.toLowerCase())
  if (match) return match
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function parseGenreList(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of input.split(/[,|/]+/)) {
    const g = normalizeGenre(part)
    if (!g || seen.has(g.toLowerCase())) continue
    seen.add(g.toLowerCase())
    out.push(g)
  }
  return out
}

export function toggleGenre(list: string[], genre: string): string[] {
  const next = normalizeGenre(genre)
  if (!next) return list
  const has = list.some((g) => g.toLowerCase() === next.toLowerCase())
  return has ? list.filter((g) => g.toLowerCase() !== next.toLowerCase()) : [...list, next]
}

export function uniqueGenres(lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list) {
      const g = normalizeGenre(raw)
      if (!g || seen.has(g.toLowerCase())) continue
      seen.add(g.toLowerCase())
      out.push(g)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}
