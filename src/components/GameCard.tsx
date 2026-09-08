import type { GameRecord } from '../types'
import { formatCount, visitScore } from '../lib/catalog'
import { go } from '../lib/route'

export function GameCard({
  game,
  plays = 0,
  compact = false,
  rank,
  onPlay,
}: {
  game: GameRecord
  plays?: number
  compact?: boolean
  rank?: number
  onPlay?: () => void
  onRemove?: () => void
}) {
  const visits = visitScore(game, { [game.id]: plays })

  return (
    <article className={`exp-tile ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="exp-hit"
        onClick={() => go({ name: 'game', id: game.id })}
      >
        <span
          className="exp-thumb"
          style={{
            background: `linear-gradient(152deg, ${game.palette.bg} 10%, ${game.cover} 78%)`,
          }}
        >
          {rank !== undefined && <em className="exp-rank">{rank}</em>}
          <strong className="exp-mono">{game.title.slice(0, 2)}</strong>
          <i className="exp-genre">{game.genres[0] || 'Game'}</i>
        </span>
        <span className="exp-copy">
          <strong>{game.title}</strong>
          <small>
            <span className="exp-dot" aria-hidden />
            {formatCount(visits)}
          </small>
        </span>
      </button>
      {onPlay && (
        <button
          type="button"
          className="exp-join"
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
        >
          Play
        </button>
      )}
    </article>
  )
}
