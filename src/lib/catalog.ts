import type { BrowseSort, GameRecord, SourceFilter } from '../types'

export const CHART_GENRES = [
  'Simulator',
  'Shooter',
  'Puzzle',
  'Horror',
  'Survival',
  'Platformer',
  'Racing',
  'Rhythm',
  'Strategy',
  'Idle',
  'Arcade',
] as const

export function visitScore(game: GameRecord, plays: Record<string, number>): number {
  return (game.visits ?? 0) + (plays[game.id] ?? 0)
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return String(Math.round(n))
}

export function rankGames(games: GameRecord[], plays: Record<string, number>): GameRecord[] {
  return [...games].sort((a, b) => {
    const diff = visitScore(b, plays) - visitScore(a, plays)
    return diff || b.createdAt.localeCompare(a.createdAt)
  })
}

export type Rail = {
  id: string
  title: string
  games: GameRecord[]
}

export function buildRails(
  games: GameRecord[],
  plays: Record<string, number>,
  recents: string[],
  mineIds: Set<string>,
  favorites: string[] = [],
): Rail[] {
  const byId = new Map(games.map((g) => [g.id, g]))
  const rails: Rail[] = []
  const continued = recents.map((id) => byId.get(id)).filter((g): g is GameRecord => Boolean(g))
  if (continued.length) rails.push({ id: 'continue', title: 'Continue', games: continued })
  const liked = favorites.map((id) => byId.get(id)).filter((g): g is GameRecord => Boolean(g))
  if (liked.length) rails.push({ id: 'favorites', title: 'Favorites', games: liked })
  const recommended = rankGames(games, plays).slice(0, 12)
  if (recommended.length) {
    rails.push({ id: 'recommended', title: 'Recommended for you', games: recommended })
  }
  const upcoming = [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10)
  if (upcoming.length) rails.push({ id: 'upcoming', title: 'Up-and-coming', games: upcoming })
  const mine = games.filter((g) => mineIds.has(g.id))
  if (mine.length) rails.push({ id: 'yours', title: 'Your experiences', games: mine })
  for (const genre of CHART_GENRES) {
    const list = games.filter((g) => g.genres.some((x) => x.toLowerCase() === genre.toLowerCase()))
    if (list.length) {
      rails.push({ id: `genre-${genre}`, title: genre, games: rankGames(list, plays) })
    }
  }
  return rails
}

export function featuredGame(
  games: GameRecord[],
  plays: Record<string, number>,
): GameRecord | undefined {
  return rankGames(games, plays)[0]
}

export type BrowseQuery = {
  query: string
  genres: string[]
  source: SourceFilter
  sort: BrowseSort
}

export function filterGames(
  games: GameRecord[],
  q: BrowseQuery,
  mineIds: Set<string>,
  plays: Record<string, number>,
): GameRecord[] {
  const text = q.query.trim().toLowerCase()
  const wanted = q.genres.map((g) => g.toLowerCase())
  const filtered = games.filter((game) => {
    if (q.source === 'house' && !game.house) return false
    if (q.source === 'mine' && !mineIds.has(game.id)) return false
    if (q.source === 'github' && game.source.kind !== 'github') return false
    if (q.source === 'upload' && game.source.kind !== 'upload') return false
    if (q.source === 'cart' && game.source.kind !== 'cart') return false
    if (wanted.length && !wanted.every((g) => game.genres.some((x) => x.toLowerCase() === g))) {
      return false
    }
    if (!text) return true
    const hay = [game.title, game.author, game.blurb, game.description, ...game.genres]
      .join(' ')
      .toLowerCase()
    return hay.includes(text)
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    if (q.sort === 'title') return a.title.localeCompare(b.title)
    if (q.sort === 'genre') return (a.genres[0] ?? '').localeCompare(b.genres[0] ?? '')
    if (q.sort === 'played') return visitScore(b, plays) - visitScore(a, plays)
    return b.createdAt.localeCompare(a.createdAt)
  })
  return sorted
}

export function similarGames(game: GameRecord, all: GameRecord[], limit = 4): GameRecord[] {
  const genres = new Set(game.genres.map((g) => g.toLowerCase()))
  return all
    .filter((g) => g.id !== game.id)
    .map((g) => ({
      g,
      score: g.genres.reduce((n, x) => n + (genres.has(x.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g)
}
