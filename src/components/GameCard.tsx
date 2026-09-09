import type { CSSProperties } from 'react'
import type { GameRecord } from '../types'
import { go } from '../lib/route'
import { livePointer } from '../lib/pointer'
import { StarRating } from './StarRating'

export function GameCard({
  game,
  rating = 0,
  compact = false,
  rank,
  stagger = 0,
  onPlay,
}: {
  game: GameRecord
  rating?: number
  compact?: boolean
  rank?: number
  stagger?: number
  onPlay?: () => void
  onRemove?: () => void
}) {
  return (
    <article className={`plate ${compact ? 'compact' : ''}`} style={{ '--stagger': stagger } as CSSProperties}>
      <button type="button" className="plate-hit" onClick={() => go({ name: 'game', id: game.id })}>
        <span
          className="plate-face tilt"
          style={{
            background: `linear-gradient(168deg, ${game.palette.bg} 12%, ${game.cover} 88%)`,
          }}
          {...livePointer}
        >
          {rank !== undefined && <em className="plate-rank">{rank}</em>}
          <i className="plate-kind">{game.genres[0] || 'Game'}</i>
          <strong className="plate-mark">{game.title}</strong>
        </span>
        <span className="plate-copy">
          <strong>{game.title}</strong>
          <span className="plate-meta">
            <StarRating value={rating} />
            <span className="plate-author">{game.author}</span>
          </span>
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
