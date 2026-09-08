import type { GameSpec } from '../types'
import { cartBytes, formatBytes } from '../lib/cart'
import { go } from '../lib/route'

export function CartCard({
  cart,
  onRemove,
}: {
  cart: GameSpec
  onRemove?: () => void
}) {
  return (
    <article className="cart-card" style={{ ['--cart-ink' as string]: cart.palette.bg }}>
      <button type="button" className="cart-face" onClick={() => go({ name: 'play', id: cart.id })}>
        <span className="cart-spine" style={{ background: cart.palette.accent }} />
        <span className="cart-sticker" style={{ background: cart.palette.paper, color: cart.palette.bg }}>
          <em>{cart.genre}</em>
          <strong>{cart.title}</strong>
          <small>{cart.blurb}</small>
        </span>
        <span className="cart-chips">
          <i style={{ background: cart.palette.player }} />
          <i style={{ background: cart.palette.enemy }} />
          <i style={{ background: cart.palette.loot }} />
        </span>
      </button>
      <footer className="cart-meta">
        <span>
          {cart.house ? 'House' : cart.author} · {formatBytes(cartBytes(cart))}
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
