import { useMemo } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, buildRails, featuredGame, filterGames, formatCount, visitScore } from '../lib/catalog'
import { go } from '../lib/route'
import { GameCard } from './GameCard'

export function DiscoverPage({
  all,
  mineIds,
  plays,
  recents,
  favorites,
  searchQuery,
  onPlay,
}: {
  all: GameRecord[]
  mineIds: Set<string>
  plays: Record<string, number>
  recents: string[]
  favorites: string[]
  searchQuery?: string
  onPlay: (id: string) => void
}) {
  const featured = featuredGame(all, plays)
  const rails = useMemo(
    () => buildRails(all, plays, recents, mineIds, favorites),
    [all, plays, recents, mineIds, favorites],
  )
  const results = useMemo(
    () =>
      searchQuery
        ? filterGames(all, { query: searchQuery, genres: [], source: 'all', sort: 'played' }, mineIds, plays)
        : [],
    [all, searchQuery, mineIds, plays],
  )

  if (searchQuery !== undefined) {
    return (
      <div className="page discover-page">
        <header className="rail-head">
          <h1>Search</h1>
          <p className="meter-line">
            {results.length} experience{results.length === 1 ? '' : 's'} for “{searchQuery || 'everything'}”
          </p>
        </header>
        {results.length === 0 ? (
          <p className="empty">No experiences match. Try a genre like Simulator or Puzzle.</p>
        ) : (
          <div className="exp-grid">
            {results.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                plays={plays[game.id] ?? 0}
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page discover-page">
      {featured && (
        <section className="spotlight">
          <button
            type="button"
            className="spotlight-art"
            style={{
              background: `linear-gradient(115deg, ${featured.palette.bg} 8%, ${featured.cover} 72%)`,
            }}
            onClick={() => go({ name: 'game', id: featured.id })}
          >
            <span className="spotlight-title">{featured.title}</span>
          </button>
          <div className="spotlight-body">
            <p className="eyebrow">Featured</p>
            <h1>{featured.title}</h1>
            <p className="lede">{featured.blurb}</p>
            <p className="meter-line">
              {featured.genres.join(' · ')} · {formatCount(visitScore(featured, plays))} visits · {featured.author}
            </p>
            <div className="hero-actions">
              <button type="button" className="play-btn" onClick={() => onPlay(featured.id)}>
                Play
              </button>
              <button type="button" className="ghost-btn" onClick={() => go({ name: 'game', id: featured.id })}>
                Experience
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="category-strip" aria-label="Categories">
        {CHART_GENRES.map((genre) => (
          <button key={genre} type="button" className="chip" onClick={() => go({ name: 'charts', genre })}>
            {genre}
          </button>
        ))}
      </div>

      {rails.map((rail) => (
        <section key={rail.id} className="rail" data-rail={rail.id}>
          <header className="rail-head">
            <h2>{rail.title}</h2>
            {rail.id.startsWith('genre-') && (
              <button
                type="button"
                className="text-btn"
                onClick={() => go({ name: 'charts', genre: rail.title })}
              >
                See all
              </button>
            )}
          </header>
          <div className="rail-track">
            {rail.games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                plays={plays[game.id] ?? 0}
                compact
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
