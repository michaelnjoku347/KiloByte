import { useMemo } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, filterGames, formatCount, rankGames, visitScore } from '../lib/catalog'
import { go } from '../lib/route'

export function ChartsPage({
  all,
  plays,
  genre,
  onPlay,
}: {
  all: GameRecord[]
  plays: Record<string, number>
  genre?: string
  onPlay: (id: string) => void
}) {
  const list = useMemo(() => {
    const filtered = genre
      ? filterGames(
          all,
          { query: '', genres: [genre], source: 'all', sort: 'played' },
          new Set(),
          plays,
        )
      : all
    return rankGames(filtered, plays)
  }, [all, genre, plays])

  return (
    <div className="page catalog-page">
      <header className="catalog-hero">
        <p className="eyebrow">Catalog</p>
        <h1>{genre ? `${genre} in the cabinet` : 'Everything on the shelf'}</h1>
        <p className="lede">
          Same games as the floor, lined up by how often they have been opened. Pick a row and press
          Play.
        </p>
      </header>
      <div className="kind-index" role="tablist" aria-label="Catalog kind">
        <p className="kind-label">Kind</p>
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
      <table className="index-table">
        <caption className="sr-only">Games ranked by plays</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Game</th>
            <th scope="col">Kind</th>
            <th scope="col">Plays</th>
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
                  {game.title}
                </button>
                <p className="index-blurb">{game.blurb}</p>
              </td>
              <td className="index-kind">{game.genres[0] || 'Game'}</td>
              <td className="index-plays">{formatCount(visitScore(game, plays))}</td>
              <td>
                <button type="button" className="play-btn slim" onClick={() => onPlay(game.id)}>
                  Play
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
