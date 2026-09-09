import { useState } from 'react'
import type { GameRecord, SiteTheme, UserProfile } from '../types'
import { shownRating } from '../lib/catalog'
import { GameCard } from './GameCard'
import { go } from '../lib/route'
import { hasPassphrase, initialsFrom } from '../lib/profile'

export function ProfilePage({
  signedIn,
  profile,
  theme,
  mine,
  saved,
  ratings,
  onPlay,
  onSignUp,
  onSignIn,
  onSignOut,
  onUpdate,
  onRemove,
  onTheme,
}: {
  signedIn: boolean
  profile: UserProfile | null
  theme: SiteTheme
  mine: GameRecord[]
  saved: GameRecord[]
  ratings: Record<string, number>
  onPlay: (id: string) => void
  onSignUp: (input: { displayName: string; handle: string; bio?: string; passphrase?: string }) => Promise<void>
  onSignIn: (passphrase?: string) => Promise<void>
  onSignOut: () => void
  onUpdate: (patch: { displayName?: string; bio?: string; passphrase?: string }) => Promise<void>
  onRemove: () => void
  onTheme: (theme: SiteTheme) => void
}) {
  return (
    <div className="page you-page">
      <section className="hero compact">
        <p className="eyebrow">You</p>
        <h1>{signedIn && profile ? profile.displayName : 'Your card'}</h1>
        <p className="lede">
          Play as a guest, or make an optional card on this browser. There is no Kilobyte account
          server — the catalog stays a static site.
        </p>
      </section>

      <AppearancePanel theme={theme} onTheme={onTheme} />

      {signedIn && profile ? (
        <SignedInCard
          profile={profile}
          mine={mine}
          saved={saved}
          ratings={ratings}
          onPlay={onPlay}
          onSignOut={onSignOut}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ) : profile ? (
        <SignInCard profile={profile} onSignIn={onSignIn} />
      ) : (
        <GuestSplit onSignUp={onSignUp} />
      )}
    </div>
  )
}

function AppearancePanel({
  theme,
  onTheme,
}: {
  theme: SiteTheme
  onTheme: (theme: SiteTheme) => void
}) {
  return (
    <section className="panel appearance-panel">
      <h2>Appearance</h2>
      <p className="meter-line">Light paper or a night desk. Stays on this browser.</p>
      <div className="theme-switch" role="radiogroup" aria-label="Appearance">
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'light'}
          className={theme === 'light' ? 'on' : ''}
          onClick={() => onTheme('light')}
        >
          Light
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'dark'}
          className={theme === 'dark' ? 'on' : ''}
          onClick={() => onTheme('dark')}
        >
          Dark
        </button>
      </div>
    </section>
  )
}

function GuestSplit({
  onSignUp,
}: {
  onSignUp: (input: { displayName: string; handle: string; bio?: string; passphrase?: string }) => Promise<void>
}) {
  return (
    <div className="you-split">
      <section className="panel">
        <h2>Keep playing as a guest</h2>
        <p className="lede">
          You can play, save, and publish without a card. New games will say Anonymous unless you
          type a name under Make.
        </p>
        <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
          Back to the floor
        </button>
      </section>
      <SignUpForm onSignUp={onSignUp} />
    </div>
  )
}

function SignUpForm({
  onSignUp,
}: {
  onSignUp: (input: { displayName: string; handle: string; bio?: string; passphrase?: string }) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await onSignUp({ displayName, handle, bio, passphrase })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make that card')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Make a card</h2>
      <p className="meter-line">Optional. Lives on this device only.</p>
      <label className="field">
        <span>Name on your games</span>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Mina" />
      </label>
      <label className="field">
        <span>Handle</span>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="mina" />
      </label>
      <label className="field">
        <span>A line about you (optional)</span>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <label className="field">
        <span>Passphrase (optional)</span>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Only if this browser is shared"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="play-btn" disabled={busy} onClick={() => void submit()}>
        {busy ? 'Making…' : 'Make this card'}
      </button>
    </section>
  )
}

function SignInCard({
  profile,
  onSignIn,
}: {
  profile: UserProfile
  onSignIn: (passphrase?: string) => Promise<void>
}) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = hasPassphrase(profile)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await onSignIn(locked ? passphrase : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that card')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Welcome back</h2>
      <p className="lede">
        A card for <strong>@{profile.handle}</strong> is already on this browser.
      </p>
      {locked && (
        <label className="field">
          <span>Passphrase</span>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        </label>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="hero-actions">
        <button type="button" className="play-btn" disabled={busy} onClick={() => void submit()}>
          Open my card
        </button>
        <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
          Stay a guest
        </button>
      </div>
    </section>
  )
}

function SignedInCard({
  profile,
  mine,
  saved,
  ratings,
  onPlay,
  onSignOut,
  onUpdate,
  onRemove,
}: {
  profile: UserProfile
  mine: GameRecord[]
  saved: GameRecord[]
  ratings: Record<string, number>
  onPlay: (id: string) => void
  onSignOut: () => void
  onUpdate: (patch: { displayName?: string; bio?: string; passphrase?: string }) => Promise<void>
  onRemove: () => void
}) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await onUpdate({ displayName, bio, passphrase: passphrase || undefined })
      setPassphrase('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="you-card">
        <div className="you-seal" aria-hidden>
          {initialsFrom(profile.displayName)}
        </div>
        <div>
          <p className="eyebrow">@{profile.handle}</p>
          <h2>{profile.displayName}</h2>
          {profile.bio && <p className="lede">{profile.bio}</p>}
          <p className="meter-line">
            On this device since {new Date(profile.createdAt).toLocaleDateString()}
            {hasPassphrase(profile) ? ' · passphrase set' : ''}
          </p>
        </div>
      </section>

      {mine.length > 0 && (
        <section className="shelf">
          <header className="shelf-head">
            <h2>You published</h2>
          </header>
          <div className="shelf-grid">
            {mine.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                compact
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className="shelf">
          <header className="shelf-head">
            <h2>Saved</h2>
          </header>
          <div className="shelf-grid">
            {saved.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                rating={shownRating(game, ratings)}
                compact
                onPlay={() => onPlay(game.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Edit the card</h2>
        <label className="field">
          <span>Name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          <span>A line about you</span>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <label className="field">
          <span>New passphrase (optional)</span>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="hero-actions">
          <button type="button" className="play-btn" disabled={busy} onClick={() => void save()}>
            Save changes
          </button>
          <button type="button" className="ghost-btn" onClick={onSignOut}>
            Sign out
          </button>
          <button type="button" className="ghost-btn" onClick={onRemove}>
            Remove this card
          </button>
        </div>
      </section>
    </>
  )
}
