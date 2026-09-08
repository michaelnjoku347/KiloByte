import { useMemo, useState } from 'react'
import type { BrowseSort, GameRecord, SourceFilter } from '../types'
import { GENRE_CATALOG } from '../lib/genres'
import { uniqueGenres } from '../lib/genres'
import { filterGames } from '../lib/catalog'
import { formatBytes } from '../lib/cart'
import { go } from '../lib/route'
import { GameCard } from './GameCard'

const SOURCES: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'house', label: 'House' },
  { id: 'mine', label: 'Yours' },
  { id: 'github', label: 'GitHub' },
  { id: 'upload', label: 'Uploads' },
  { id: 'cart', label: 'Carts' },
]

const SORTS: { id: BrowseSort; label: string }[] = [
  { id: 'new', label: 'Newest' },
  { id: 'title', label: 'Title' },
  { id: 'played', label: 'Most played' },
  { id: 'genre', label: 'Genre' },
]

export function BrowsePage({
  all,
  mineIds,
  plays,
  bytes,
  onRemove,
}: {
  all: GameRecord[]
  mineIds: Set<string>
  plays: Record<string, number>
  bytes: number
  onRemove: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [source, setSource] = useState<SourceFilter>('all')
  const [sort, setSort] = useState<BrowseSort>('new')

  const available = useMemo(
    () => uniqueGenres([ [...GENRE_CATALOG], ...all.map((g) => g.genres) ]),
    [all],
  )
  const list = useMemo(
    () => filterGames(all, { query, genres, source, sort }, mineIds, plays),
    [all, query, genres, source, sort, mineIds, plays],
  )

  const toggle = (genre: string) => {
    setGenres((cur) =>
      cur.some((g) => g.toLowerCase() === genre.toLowerCase())
        ? cur.filter((g) => g.toLowerCase() !== genre.toLowerCase())
        : [...cur, genre],
    )
  }

  return (
    <div className="page arcade-page">
      <section className="hero">
        <p className="eyebrow">Public cabinet · dashboards · any genre</p>
        <h1>Play anything. Host almost nothing.</h1>
        <p className="lede">
          Search the library, open a game dashboard, then play. Creators upload a build or
          connect a GitHub repo. You keep the catalog; they keep the files.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-btn" onClick={() => go({ name: 'create', tab: 'upload' })}>
            Create a game
          </button>
          <button type="button" className="ghost-btn" onClick={() => go({ name: 'why' })}>
            How hosting stays cheap
          </button>
        </div>
        <p className="meter-line">
          {all.length} games · local weight {formatBytes(bytes)} · GitHub games count as metadata
        </p>
      </section>

      <label className="search browse-search">
        <span className="sr-only">Search games</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, genre, author, description"
        />
      </label>

      <div className="genre-cloud" role="group" aria-label="Filter by genre">
        {available.map((genre) => (
          <button
            key={genre}
            type="button"
            className={`chip ${genres.some((g) => g.toLowerCase() === genre.toLowerCase()) ? 'chip-on' : ''}`}
            onClick={() => toggle(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Source">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={source === s.id}
              className={source === s.id ? 'on' : ''}
              onClick={() => setSource(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="sort-field">
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as BrowseSort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <p className="empty">Nothing matches. Clear a genre chip or publish from Create.</p>
      ) : (
        <div className="cart-grid">
          {list.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              plays={plays[game.id] ?? 0}
              onRemove={mineIds.has(game.id) && !game.house ? () => onRemove(game.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
