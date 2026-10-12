import type { GameRecord } from '../types'

export function forYou(
  games: GameRecord[],
  plays: Record<string, number>,
  favorites: string[],
  limit = 8,
): GameRecord[] {
  const seeds = games.filter((game) => favorites.includes(game.id) || (plays[game.id] ?? 0) > 0)
  const genres = new Set(seeds.flatMap((game) => game.genres.map((genre) => genre.toLowerCase())))
  const ranked = [...games].sort((a, b) => score(b, genres, plays, favorites) - score(a, genres, plays, favorites))
  return ranked.filter((game) => !favorites.includes(game.id)).slice(0, limit)
}

function score(game: GameRecord, genres: Set<string>, plays: Record<string, number>, favorites: string[]): number {
  const overlap = game.genres.reduce((n, genre) => n + (genres.has(genre.toLowerCase()) ? 2 : 0), 0)
  const fresh = favorites.includes(game.id) ? -5 : 0
  const played = Math.min(3, plays[game.id] ?? 0)
  return overlap + (game.rating ?? 0) * 0.15 + fresh - played * 0.4
}

export type MashupIdea = { title: string; pitch: string }

const PAIRS: [string, string][] = [
  ['a harbor ledger', 'a lantern boat'],
  ['a brick kiln', 'a table puck'],
  ['a night museum', 'a rhythm rail'],
  ['a garden plot', 'a sliding puzzle'],
  ['a transit map', 'a hex board'],
  ['a three-lane road', 'a quiet shooter'],
]

export function mashupIdeas(prompt: string): MashupIdea[] {
  const seed = [...prompt].reduce((n, ch) => n + ch.charCodeAt(0), 0)
  return [0, 1, 2].map((offset) => {
    const pair = PAIRS[(seed + offset) % PAIRS.length]
    return {
      title: pair.map((part) => part.replace(/^a /, '')).join(' × '),
      pitch: `Cross ${pair[0]} with ${pair[1]}. Keep the name, shapes, and code original. Prompt: ${prompt.trim() || 'a small arcade'}.`,
    }
  })
}
