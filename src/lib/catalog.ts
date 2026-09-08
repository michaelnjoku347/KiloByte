import type { BrowseSort, GameRecord, SourceFilter } from '../types'

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
    if (q.sort === 'played') return (plays[b.id] ?? 0) - (plays[a.id] ?? 0)
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
