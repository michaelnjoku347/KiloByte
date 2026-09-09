import type { GameRecord } from '../types'
import { formatBytes } from '../lib/cart'
import { similarGames, shownRating } from '../lib/catalog'
import { playUrlFor, sourceLabel } from '../lib/record'
import { go } from '../lib/route'
import { livePointer } from '../lib/pointer'
import { GameCard } from './GameCard'
import { StarRating } from './StarRating'

export function DashboardPage({
  game,
  all,
  plays,
  ratings,
  mine,
  favorited,
  onRemove,
  onPlay,
  onFavorite,
  onRate,
  onPlayOther,
}: {
  game: GameRecord
  all: GameRecord[]
  plays: number
  ratings: Record<string, number>
  mine: boolean
  favorited: boolean
  onRemove: () => void
  onPlay: () => void
  onFavorite: () => void
  onRate: (stars: number) => void
  onPlayOther: (id: string) => void
}) {
  const related = similarGames(game, all, 8)
  const href = playUrlFor(game)
  const github = game.source.kind === 'github' ? game.source.htmlUrl : undefined
  const score = shownRating(game, ratings)
  const yours = ratings[game.id] != null
  const extras = [
    plays > 0 ? 'Played on this device' : null,
    game.bytes ? `${formatBytes(game.bytes)} local` : 'hosted off-site',
  ].filter(Boolean)

  return (
    <div className="page dash-page">
      <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
        ← Back
      </button>
      <section className="dossier">
        <div
          className="dossier-poster tilt"
          style={{ background: `linear-gradient(168deg, ${game.palette.bg}, ${game.cover})` }}
          {...livePointer}
        >
          <i>{game.genres[0] || 'Game'}</i>
          <span>{game.title}</span>
        </div>
        <div className="dossier-side">
          <p className="eyebrow">{game.genres.join(' · ') || 'Game'}</p>
          <h1>{game.title}</h1>
          <p className="creator-row">by {game.author}</p>
          <p className="lede">{game.blurb}</p>
          <div className="rate-row">
            <StarRating value={score} size="md" interactive onChange={onRate} />
            <p className="meter-line">{yours ? 'Your score' : 'Tap a star to rate'}</p>
          </div>
          {extras.length > 0 && <p className="meter-line">{extras.join(' · ')}</p>}
          <div className="hero-actions">
            <button type="button" className="play-btn" onClick={onPlay}>
              Play this
            </button>
            <button type="button" className={`ghost-btn ${favorited ? 'on-fav' : ''}`} onClick={onFavorite}>
              {favorited ? 'Saved' : 'Save'}
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
        <h2>What this is</h2>
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
            <dt>Kinds</dt>
            <dd>{game.genres.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt>Kind of file</dt>
            <dd>{game.source.kind}</dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="shelf">
          <header className="shelf-head">
            <h2>Nearby on the shelf</h2>
          </header>
          <div className="shelf-grid">
            {related.map((item, i) => (
              <GameCard
                key={item.id}
                game={item}
                rating={shownRating(item, ratings)}
                compact
                stagger={i}
                onPlay={() => onPlayOther(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
