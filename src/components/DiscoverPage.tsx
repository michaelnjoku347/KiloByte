import { useMemo } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, buildRails, featuredGame, filterGames, shownRating } from '../lib/catalog'
import { go } from '../lib/route'
import { livePointer } from '../lib/pointer'
import { GameCard } from './GameCard'
import { StarRating } from './StarRating'

export function DiscoverPage({
  all,
  mineIds,
  ratings,
  recents,
  favorites,
  searchQuery,
  onPlay,
}: {
  all: GameRecord[]
  mineIds: Set<string>
  ratings: Record<string, number>
  recents: string[]
  favorites: string[]
  searchQuery?: string
  onPlay: (id: string) => void
}) {
  const featured = featuredGame(all, ratings)
  const shelves = useMemo(
    () =>
      buildRails(all, ratings, recents, mineIds, favorites).filter(
        (shelf) => !shelf.id.startsWith('genre-'),
      ),
    [all, ratings, recents, mineIds, favorites],
  )
  const results = useMemo(
    () =>
      searchQuery
        ? filterGames(all, { query: searchQuery, genres: [], source: 'all', sort: 'rating' }, mineIds, ratings)
        : [],
    [all, searchQuery, mineIds, ratings],
  )

  if (searchQuery !== undefined) {
    return (
      <div className="page floor-page">
        <header className="shelf-head">
          <h1>Find a game</h1>
          <p className="meter-line">
            {results.length} match{results.length === 1 ? '' : 'es'} for “{searchQuery || 'everything'}”
          </p>
        </header>
        {results.length === 0 ? (
          <p className="empty">Nothing by that name. Try Puzzle, Simulator, or a title like Dock Ledger.</p>
        ) : (
          <div className="shelf-grid">
            {results.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                stagger={i}
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page floor-page">
      <section className="howto" aria-label="How Kilobyte works">
        <ol>
          <li>
            <strong>1</strong>
            <span>Pick a game from the shelf.</span>
          </li>
          <li>
            <strong>2</strong>
            <span>Press Play. It runs in this tab.</span>
          </li>
          <li>
            <strong>3</strong>
            <span>Or open Make and publish yours.</span>
          </li>
        </ol>
      </section>

      {featured && (
        <section className="lead">
          <p className="eyebrow">Start here</p>
          <div className="lead-spread">
            <button
              type="button"
              className="lead-poster tilt"
              style={{
                background: `linear-gradient(168deg, ${featured.palette.bg} 10%, ${featured.cover} 80%)`,
              }}
              onClick={() => go({ name: 'game', id: featured.id })}
              {...livePointer}
            >
              <i>{featured.genres[0]}</i>
              <span>{featured.title}</span>
            </button>
            <div className="lead-body">
              <h1>{featured.title}</h1>
              <p className="lede">{featured.blurb}</p>
              <p className="meter-line lead-rating">
                <span>{featured.genres.join(' · ')}</span>
                <StarRating value={shownRating(featured, ratings)} size="md" />
                <span>{featured.author}</span>
              </p>
              <div className="hero-actions">
                <button type="button" className="play-btn" onClick={() => onPlay(featured.id)}>
                  Play this
                </button>
                <button type="button" className="ghost-btn" onClick={() => go({ name: 'game', id: featured.id })}>
                  Read the card
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <nav className="kind-index" aria-label="Kinds of games">
        <p className="kind-label">Jump by kind</p>
        <div className="kind-links">
          {CHART_GENRES.map((genre) => (
            <button key={genre} type="button" className="kind-link" onClick={() => go({ name: 'charts', genre })}>
              {genre}
            </button>
          ))}
        </div>
      </nav>

      {shelves.map((shelf) => (
        <section key={shelf.id} className="shelf" data-rail={shelf.id}>
          <header className="shelf-head">
            <h2>{shelf.title}</h2>
            {shelf.id === 'recommended' && (
              <button type="button" className="text-btn" onClick={() => go({ name: 'charts' })}>
                Full catalog
              </button>
            )}
          </header>
          <div className="shelf-grid">
            {shelf.games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                compact
                stagger={i}
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
