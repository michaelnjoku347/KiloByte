import { lazy, Suspense, useMemo, useState } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, buildRails, featuredGame, filterGames, shownRating } from '../lib/catalog'
import { go } from '../lib/route'
import { livePointer } from '../lib/pointer'
import { GameCard } from './GameCard'
import { StarRating } from './StarRating'
import { ageLabel } from '../lib/age'
import { forYou } from '../lib/recommend'

const CinderField = lazy(() => import('./CinderField').then((mod) => ({ default: mod.CinderField })))

export function DiscoverPage({
  all,
  mineIds,
  ratings,
  recents,
  favorites,
  plays,
  searchQuery,
  onPlay,
  onSave,
}: {
  all: GameRecord[]
  mineIds: Set<string>
  ratings: Record<string, number>
  recents: string[]
  favorites: string[]
  plays: Record<string, number>
  searchQuery?: string
  onPlay: (id: string) => void
  onSave: (id: string) => void
}) {
  const [age, setAge] = useState<'any' | 'all' | '10' | '13' | '16'>('any')
  const visible = useMemo(
    () => all.filter((game) => age === 'any' || (game.age ?? 'all') === age),
    [all, age],
  )
  const flagship = visible.find((game) => game.source.kind === 'stage') ?? all.find((game) => game.source.kind === 'stage')
  const featured = flagship ?? featuredGame(all, ratings)
  const picks = useMemo(
    () => forYou(visible, plays, favorites, 6).filter((game) => game.id !== flagship?.id),
    [visible, plays, favorites, flagship],
  )
  const shelves = useMemo(
    () =>
      buildRails(visible, ratings, recents, mineIds, favorites)
        .filter((shelf) => !shelf.id.startsWith('genre-'))
        .map((shelf) =>
          shelf.id === 'recommended' && flagship
            ? { ...shelf, games: shelf.games.filter((game) => game.id !== flagship.id) }
            : shelf,
        ),
    [visible, ratings, recents, mineIds, favorites, flagship],
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
        <nav className="kind-index search-kinds" aria-label="Browse by genre instead">
          <p className="kind-label">Or browse</p>
          <div className="kind-links">
            {CHART_GENRES.map((genre) => (
              <button key={genre} type="button" className="kind-link" onClick={() => go({ name: 'charts', genre })}>
                {genre}
              </button>
            ))}
          </div>
        </nav>
        {results.length === 0 ? (
          <p className="empty">Nothing by that name. Try Puzzle, Simulator, or a title like Dock Ledger.</p>
        ) : (
          <div className="shelf-grid">
            {results.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                favorited={favorites.includes(game.id)}
                stagger={i}
                onPlay={() => onPlay(game.id)}
                onSave={() => onSave(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page floor-page">
      {featured && featured.source.kind === 'stage' && (
        <section className="lead lead-stage">
          <div className="lead-spread">
            <div className="lead-stage-view">
              <Suspense fallback={<div className="cinder-preview" aria-busy="true" />}>
                <CinderField mode="preview" />
              </Suspense>
              <button
                type="button"
                className="lead-stage-hit"
                aria-label={`${featured.title} details`}
                onClick={() => go({ name: 'game', id: featured.id })}
              />
            </div>
            <div className="lead-body">
              <p className="eyebrow">In this tab</p>
              <h1>{featured.title}</h1>
              <p className="lede">{featured.blurb}</p>
              <p className="stage-specs">
                <span>WebGL2</span>
                <span>Versus bots</span>
                <span>{ageLabel(featured.age)}</span>
              </p>
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
                  Details
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {featured && featured.source.kind !== 'stage' && (
        <section className="lead">
          <p className="eyebrow">Featured</p>
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
                  Details
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="howto" aria-label="How Kilobyte works">
        <ol>
          <li>
            <strong>1</strong>
            <span>Pick a title.</span>
          </li>
          <li>
            <strong>2</strong>
            <span>Launch it in this tab.</span>
          </li>
          <li>
            <strong>3</strong>
            <span>Publish a WebGL or HTML build.</span>
          </li>
        </ol>
      </section>

      <nav className="kind-index" aria-label="Age tags">
        <p className="kind-label">Age</p>
        <div className="kind-links">
          {([
            ['any', 'All ages'],
            ['all', 'Everyone'],
            ['10', '10+'],
            ['13', '13+'],
            ['16', '16+'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={`kind-link${age === id ? ' on' : ''}`} onClick={() => setAge(id)}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <nav className="kind-index" aria-label="Game genres">
        <p className="kind-label">Browse</p>
        <div className="kind-links">
          {CHART_GENRES.map((genre) => (
            <button key={genre} type="button" className="kind-link" onClick={() => go({ name: 'charts', genre })}>
              {genre}
            </button>
          ))}
        </div>
      </nav>

      {picks.length > 0 && (
        <section className="shelf" data-rail="for-you">
          <header className="shelf-head">
            <h2>For you</h2>
            <p className="meter-line">From games you played and saved on this device. Not a model.</p>
          </header>
          <div className="shelf-grid">
            {picks.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                favorited={favorites.includes(game.id)}
                compact
                stagger={i}
                onPlay={() => onPlay(game.id)}
                onSave={() => onSave(game.id)}
              />
            ))}
          </div>
        </section>
      )}

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
                favorited={favorites.includes(game.id)}
                compact
                stagger={i}
                onPlay={() => onPlay(game.id)}
                onSave={() => onSave(game.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
