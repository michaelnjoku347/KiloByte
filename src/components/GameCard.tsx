import type { GameRecord } from '../types'
import { formatBytes } from '../lib/cart'
import { sourceLabel } from '../lib/record'
import { go } from '../lib/route'

export function GameCard({
  game,
  plays = 0,
  onRemove,
}: {
  game: GameRecord
  plays?: number
  onRemove?: () => void
}) {
  return (
    <article className="cart-card">
      <button
        type="button"
        className="cart-face"
        style={{ ['--cart-ink' as string]: game.palette.bg }}
        onClick={() => go({ name: 'game', id: game.id })}
      >
        <span className="cart-spine" style={{ background: game.cover }} />
        <span
          className="cart-sticker"
          style={{ background: game.palette.paper, color: game.palette.bg }}
        >
          <em>{game.genres.slice(0, 2).join(' · ') || 'Game'}</em>
          <strong>{game.title}</strong>
          <small>{game.blurb}</small>
        </span>
        <span className="cart-chips">
          <i style={{ background: game.palette.accent }} />
          <i style={{ background: game.cover }} />
          <i style={{ background: game.palette.paper }} />
        </span>
      </button>
      <footer className="cart-meta">
        <span>
          {game.house ? 'House' : game.author} · {sourceLabel(game.source)}
          {game.bytes > 0 ? ` · ${formatBytes(game.bytes)}` : ''}
          {plays ? ` · ${plays} plays` : ''}
        </span>
        {onRemove && (
          <button type="button" className="text-btn" onClick={onRemove}>
            Remove
          </button>
        )}
      </footer>
    </article>
  )
}
