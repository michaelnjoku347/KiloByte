import type { GameRecord } from '../types'
import { formatBytes } from '../lib/cart'
import { formatCount, similarGames, visitScore } from '../lib/catalog'
import { playUrlFor, sourceLabel } from '../lib/record'
import { go } from '../lib/route'
import { GameCard } from './GameCard'

export function DashboardPage({
  game,
  all,
  plays,
  mine,
  favorited,
  onRemove,
  onPlay,
  onFavorite,
  onPlayOther,
}: {
  game: GameRecord
  all: GameRecord[]
  plays: number
  mine: boolean
  favorited: boolean
  onRemove: () => void
  onPlay: () => void
  onFavorite: () => void
  onPlayOther: (id: string) => void
}) {
  const related = similarGames(game, all, 8)
  const href = playUrlFor(game)
  const github = game.source.kind === 'github' ? game.source.htmlUrl : undefined
  const visits = visitScore(game, { [game.id]: plays })

  return (
    <div className="page dash-page">
      <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
        ← Discover
      </button>
      <section className="experience">
        <div
          className="experience-cover"
          style={{ background: `linear-gradient(145deg, ${game.palette.bg}, ${game.cover})` }}
        >
          <span>{game.title}</span>
        </div>
        <div className="experience-side">
          <p className="eyebrow">{game.genres.join(' · ') || 'Experience'}</p>
          <h1>{game.title}</h1>
          <p className="creator-row">
            <i className="avatar">{game.author.slice(0, 1)}</i>
            {game.author}
          </p>
          <p className="lede">{game.blurb}</p>
          <p className="meter-line">
            {formatCount(visits)} visits · {plays} on this device
            {game.bytes ? ` · ${formatBytes(game.bytes)} local` : ' · hosted off-site'}
          </p>
          <div className="hero-actions">
            <button type="button" className="play-btn" onClick={onPlay}>
              Play
            </button>
            <button type="button" className={`ghost-btn ${favorited ? 'on-fav' : ''}`} onClick={onFavorite}>
              {favorited ? 'Favorited' : 'Favorite'}
            </button>
            {github && (
              <a className="ghost-btn link-btn" href={github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            {href && game.source.kind !== 'cart' && (
              <a className="ghost-btn link-btn" href={href} target="_blank" rel="noreferrer">
                Raw build
              </a>
            )}
            {mine && (
              <button type="button" className="ghost-btn" onClick={onRemove}>
                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel about-panel">
        <h2>About this experience</h2>
        <p className="dash-copy">{game.description}</p>
        <dl className="spec-dl">
          <div>
            <dt>Created</dt>
            <dd>{new Date(game.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{sourceLabel(game.source)}</dd>
          </div>
          <div>
            <dt>Genres</dt>
            <dd>{game.genres.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt>Kind</dt>
            <dd>{game.source.kind}</dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="rail">
          <header className="rail-head">
            <h2>Recommended</h2>
          </header>
          <div className="rail-track">
            {related.map((item) => (
              <GameCard
                key={item.id}
                game={item}
                compact
                onPlay={() => onPlayOther(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
