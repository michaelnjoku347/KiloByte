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
    <article className={`plate ${compact ? 'compact' : ''}`}>
      <button type="button" className="plate-hit" onClick={() => go({ name: 'game', id: game.id })}>
        <span
          className="plate-face"
          style={{
            background: `linear-gradient(168deg, ${game.palette.bg} 12%, ${game.cover} 88%)`,
          }}
        >
          {rank !== undefined && <em className="plate-rank">{rank}</em>}
          <i className="plate-kind">{game.genres[0] || 'Game'}</i>
          <strong className="plate-mark">{game.title}</strong>
        </span>
        <span className="plate-copy">
          <strong>{game.title}</strong>
          <small>
            {formatCount(visits)} plays · {game.author}
          </small>
        </span>
      </button>
      {onPlay && (
        <button
          type="button"
          className="plate-play"
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
