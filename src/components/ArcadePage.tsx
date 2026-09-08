import { useMemo, useState } from 'react'
import type { GameSpec } from '../types'
import { CartCard } from './CartCard'
import { go } from '../lib/route'
import { formatBytes } from '../lib/cart'

type Filter = 'all' | 'house' | 'mine'

export function ArcadePage({
  all,
  mine,
  bytes,
  onRemove,
}: {
  all: GameSpec[]
  mine: GameSpec[]
  bytes: number
  onRemove: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const mineIds = useMemo(() => new Set(mine.map((c) => c.id)), [mine])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((c) => {
      if (filter === 'house' && !c.house) return false
      if (filter === 'mine' && !mineIds.has(c.id)) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.genre.includes(q) ||
        c.theme.includes(q) ||
        c.prompt.toLowerCase().includes(q)
      )
    })
  }, [all, filter, mineIds, query])

  return (
    <div className="page arcade-page">
      <section className="hero">
        <p className="eyebrow">Free arcade · recipes, not binaries</p>
        <h1>
          Games that fit
          <br />
          in a kilobyte.
        </h1>
        <p className="lede">
          Describe a game, mint a tiny JSON cart, and publish it. Visitors play in the
          browser. You never host a Unity build, a video, or a database.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-btn" onClick={() => go({ name: 'studio' })}>
            Make a cart
          </button>
          <button type="button" className="ghost-btn" onClick={() => go({ name: 'why' })}>
            Why this stays cheap
          </button>
        </div>
        <p className="meter-line">
          Cabinet weight {formatBytes(bytes)} · {all.length} carts · estimated hosting $0
        </p>
      </section>

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Arcade filter">
          {(['all', 'house', 'mine'] as Filter[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={filter === id ? 'on' : ''}
              onClick={() => setFilter(id)}
            >
              {id === 'all' ? 'Whole arcade' : id === 'house' ? 'House carts' : 'Your carts'}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search carts</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, genre, theme"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <p className="empty">Nothing on this shelf. Mint a cart in the studio.</p>
      ) : (
        <div className="cart-grid">
          {list.map((cart) => (
            <CartCard
              key={cart.id}
              cart={cart}
              onRemove={mineIds.has(cart.id) && !cart.house ? () => onRemove(cart.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
