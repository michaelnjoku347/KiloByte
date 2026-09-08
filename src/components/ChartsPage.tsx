import { useMemo } from 'react'
import type { GameRecord } from '../types'
import { CHART_GENRES, filterGames, formatCount, rankGames, visitScore } from '../lib/catalog'
import { go } from '../lib/route'
import { GameCard } from './GameCard'

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
    <div className="page charts-page">
      <header className="charts-hero">
        <p className="eyebrow">Charts</p>
        <h1>{genre ? `${genre} charts` : 'Top experiences'}</h1>
        <p className="lede">
          Ranked by cabinet visits plus your local plays. Same Discover catalog, sorted the way a
          lobby sorts.
        </p>
      </header>
      <div className="category-strip" role="tablist" aria-label="Chart genre">
        <button
          type="button"
          className={`chip ${!genre ? 'chip-on' : ''}`}
          onClick={() => go({ name: 'charts' })}
        >
          All
        </button>
        {CHART_GENRES.map((g) => (
          <button
            key={g}
            type="button"
            className={`chip ${genre === g ? 'chip-on' : ''}`}
            onClick={() => go({ name: 'charts', genre: g })}
          >
            {g}
          </button>
        ))}
      </div>
      <ol className="chart-list">
        {list.map((game, i) => (
          <li key={game.id} className="chart-row">
            <GameCard
              game={game}
              plays={plays[game.id] ?? 0}
              rank={i + 1}
              onPlay={() => onPlay(game.id)}
            />
            <p className="chart-meta">
              {game.blurb} · {formatCount(visitScore(game, plays))} visits
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
