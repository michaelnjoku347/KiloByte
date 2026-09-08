import type { GameRecord } from '../types'
import { formatBytes } from '../lib/cart'
import { playUrlFor, sourceLabel } from '../lib/record'
import { similarGames } from '../lib/catalog'
import { go } from '../lib/route'
import { GameCard } from './GameCard'

export function DashboardPage({
  game,
  all,
  plays,
  mine,
  onRemove,
  onPlay,
}: {
  game: GameRecord
  all: GameRecord[]
  plays: number
  mine: boolean
  onRemove: () => void
  onPlay: () => void
}) {
  const related = similarGames(game, all)
  const href = playUrlFor(game)
  const github = game.source.kind === 'github' ? game.source.htmlUrl : undefined

  return (
    <div className="page dash-page">
      <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
        ← Arcade
      </button>
      <section
        className="dash-hero"
        style={{ background: `linear-gradient(135deg, ${game.palette.bg}, #17140f 70%)` }}
      >
        <p className="eyebrow">{game.genres.join(' · ') || 'Unclassified'}</p>
        <h1>{game.title}</h1>
        <p className="lede">{game.blurb}</p>
        <div className="hero-actions">
          <button type="button" className="primary-btn" onClick={onPlay}>
            Play
          </button>
          {github && (
            <a className="ghost-btn link-btn" href={github} target="_blank" rel="noreferrer">
              Open GitHub
            </a>
          )}
          {href && game.source.kind !== 'cart' && (
            <a className="ghost-btn link-btn" href={href} target="_blank" rel="noreferrer">
              Open raw build
            </a>
          )}
          {mine && (
            <button type="button" className="ghost-btn" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </section>

      <div className="dash-stats">
        <article className="panel stat-mini">
          <span>Plays on this device</span>
          <strong>{plays}</strong>
        </article>
        <article className="panel stat-mini">
          <span>Local bytes</span>
          <strong>{game.bytes ? formatBytes(game.bytes) : '$0 host'}</strong>
        </article>
        <article className="panel stat-mini">
          <span>Source</span>
          <strong>{sourceLabel(game.source)}</strong>
        </article>
        <article className="panel stat-mini">
          <span>Author</span>
          <strong>{game.author}</strong>
        </article>
      </div>

      <section className="panel">
        <h2>Dashboard</h2>
        <p className="dash-copy">{game.description}</p>
        <dl className="spec-dl">
          <div>
            <dt>Published</dt>
            <dd>{new Date(game.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Genres</dt>
            <dd>{game.genres.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt>Kind</dt>
            <dd>{game.source.kind}</dd>
          </div>
          <div>
            <dt>Id</dt>
            <dd>{game.id}</dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="related-title">More in these genres</h2>
          <div className="cart-grid">
            {related.map((item) => (
              <GameCard key={item.id} game={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
