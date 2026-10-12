import { useMemo, useState } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, filterGames, rankGames, shownRating } from '../lib/catalog'
import { runtimeOf } from '../lib/record'
import { go } from '../lib/route'
import { StarRating } from './StarRating'

const RUNTIMES = [
  { id: 'all', label: 'Any build' },
  { id: 'html', label: 'HTML' },
  { id: 'wasm', label: 'WASM' },
  { id: 'cart', label: 'Cart' },
] as const

export function ChartsPage({
  all,
  ratings,
  genre,
  onPlay,
}: {
  all: GameRecord[]
  ratings: Record<string, number>
  genre?: string
  onPlay: (id: string) => void
}) {
  const [runtime, setRuntime] = useState<(typeof RUNTIMES)[number]['id']>('all')
  const list = useMemo(() => {
    const filtered = genre
      ? filterGames(
          all,
          { query: '', genres: [genre], source: 'all', sort: 'rating' },
          new Set(),
          ratings,
        )
      : all
    const ranked = rankGames(filtered, ratings)
    if (runtime === 'all') return ranked
    return ranked.filter((game) => runtimeOf(game) === runtime)
  }, [all, genre, ratings, runtime])

  return (
    <div className="page catalog-page">
      <header className="catalog-hero">
        <p className="eyebrow">Catalog</p>
        <h1>{genre ? genre : 'All games'}</h1>
        <p className="lede">
          Ranked by star rating. Open a title or press Play.
        </p>
      </header>
      <div className="kind-index" role="tablist" aria-label="Catalog genre">
        <p className="kind-label">Genre</p>
        <div className="kind-links">
          <button
            type="button"
            className={`kind-link ${!genre ? 'kind-on' : ''}`}
            onClick={() => go({ name: 'charts' })}
          >
            All
          </button>
          {CHART_GENRES.map((g) => (
            <button
              key={g}
              type="button"
              className={`kind-link ${genre === g ? 'kind-on' : ''}`}
              onClick={() => go({ name: 'charts', genre: g })}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="kind-index runtime-index" role="tablist" aria-label="Catalog runtime">
        <p className="kind-label">Build</p>
        <div className="kind-links">
          {RUNTIMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kind-link ${runtime === item.id ? 'kind-on' : ''}`}
              onClick={() => setRuntime(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="empty">Nothing in this slice yet. Try another genre or build, or publish one from Make.</p>
      ) : (
        <table className="index-table">
          <caption className="sr-only">Games ranked by star rating</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Game</th>
              <th scope="col">Genre</th>
              <th scope="col">Rating</th>
              <th scope="col">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((game, i) => (
              <tr key={game.id}>
                <td className="index-num">{i + 1}</td>
                <td>
                  <button type="button" className="index-title" onClick={() => go({ name: 'game', id: game.id })}>
                    <span
                      className="index-cover"
                      style={{
                        background: `linear-gradient(160deg, ${game.palette.bg} 10%, ${game.cover} 90%)`,
                      }}
                    />
                    <span>
                      {game.title}
                      {game.source.kind === 'wasm' && <span className="index-tag">WASM</span>}
                      <p className="index-blurb">{game.blurb}</p>
                    </span>
                  </button>
                </td>
                <td className="index-kind">{game.genres[0] || 'Game'}</td>
                <td className="index-rating">
                  <StarRating value={shownRating(game, ratings)} />
                </td>
                <td>
                  <button type="button" className="play-btn slim" onClick={() => onPlay(game.id)}>
                    Play
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
