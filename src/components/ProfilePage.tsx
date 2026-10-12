import { useState } from 'react'
import type { GameRecord, SiteTheme, UserProfile } from '../types'
import { shownRating } from '../lib/catalog'
import { GameCard } from './GameCard'
import { go } from '../lib/route'
import { hasPassphrase, initialsFrom } from '../lib/profile'
import { cloudClient, readCloudConfig } from '../lib/cloud'

export function ProfilePage({
  signedIn,
  profile,
  theme,
  mine,
  saved,
  ratings,
  favorites,
  onPlay,
  onSave,
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
  favorites: string[]
  onPlay: (id: string) => void
  onSave: (id: string) => void
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
          Play as a guest, or make an optional card on this browser. Cloud accounts, uploads, ratings,
          and lobbies turn on only after a free Supabase project is configured. Until then everything
          stays on this device.
        </p>
      </section>

      <AppearancePanel theme={theme} onTheme={onTheme} />
      <CloudAccount />

      {signedIn && profile ? (
        <SignedInCard
          profile={profile}
          mine={mine}
          saved={saved}
          ratings={ratings}
          favorites={favorites}
          onPlay={onPlay}
          onSave={onSave}
          onSignOut={onSignOut}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ) : profile ? (
        <SignInCard profile={profile} onSignIn={onSignIn} onRemove={onRemove} />
      ) : (
        <GuestSplit onSignUp={onSignUp} />
      )}
    </div>
  )
}

function CloudAccount() {
  const configured = readCloudConfig() !== null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')

  if (!configured) {
    return (
      <section className="panel">
        <h2>Cloud account</h2>
        <p>
          Off. Ratings, favorites, play counts, leaderboards, creator uploads, and lobbies stay on this
          browser. The README lists the free Supabase project and the Gemini secret. No key is built
          into this page.
        </p>
      </section>
    )
  }

  const submit = async (mode: 'up' | 'in') => {
    const pending = cloudClient()
    if (!pending) return
    const client = await pending
    const result =
      mode === 'up'
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password })
    if (result.error) {
      setNote(result.error.message)
      return
    }
    const session = await client.auth.getSession()
    const id = session.data.session?.user.id
    if (!id) {
      setNote('Check the confirmation email, then sign in. The project may require that before a session exists.')
      return
    }
    const handle = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'player'
    const saved = await client.from('profiles').upsert({ id, handle, display_name: handle, bio: '' })
    setNote(saved.error ? saved.error.message : `Signed in as ${handle}.`)
  }

  return (
    <section className="panel">
      <h2>Cloud account</h2>
      <p>Email and password go to your Supabase project. The anon key is public. Row Level Security limits each row to its owner.</p>
      <label className="field">
        <span>Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      <div className="hero-actions">
        <button type="button" className="primary-btn" onClick={() => void submit('up')}>
          Create cloud account
        </button>
        <button type="button" className="ghost-btn" onClick={() => void submit('in')}>
          Sign in
        </button>
      </div>
      {note && <p className="meter-line">{note}</p>}
    </section>
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
      <p className="meter-line">Light or dark. Saved on this browser.</p>
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
          Back to Play
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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
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
        <button type="submit" className="play-btn" disabled={busy}>
          {busy ? 'Making…' : 'Make this card'}
        </button>
      </form>
    </section>
  )
}

function SignInCard({
  profile,
  onSignIn,
  onRemove,
}: {
  profile: UserProfile
  onSignIn: (passphrase?: string) => Promise<void>
  onRemove: () => void
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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {locked && (
          <label className="field">
            <span>Passphrase</span>
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="hero-actions">
          <button type="submit" className="play-btn" disabled={busy}>
            Open my card
          </button>
          <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
            Stay a guest
          </button>
          <button type="button" className="ghost-btn" onClick={onRemove}>
            Remove this card
          </button>
        </div>
      </form>
      {locked && (
        <p className="meter-line">Forgot the passphrase? Remove the card from this browser to start over.</p>
      )}
    </section>
  )
}

function SignedInCard({
  profile,
  mine,
  saved,
  ratings,
  favorites,
  onPlay,
  onSave,
  onSignOut,
  onUpdate,
  onRemove,
}: {
  profile: UserProfile
  mine: GameRecord[]
  saved: GameRecord[]
  ratings: Record<string, number>
  favorites: string[]
  onPlay: (id: string) => void
  onSave: (id: string) => void
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
                favorited={favorites.includes(game.id)}
                compact
                onPlay={() => onPlay(game.id)}
                onSave={() => onSave(game.id)}
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
                favorited={favorites.includes(game.id)}
                compact
                onPlay={() => onPlay(game.id)}
                onSave={() => onSave(game.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Edit the card</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
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
            <button type="submit" className="play-btn" disabled={busy}>
              Save changes
            </button>
            <button type="button" className="ghost-btn" onClick={onSignOut}>
              Sign out
            </button>
            <button type="button" className="ghost-btn" onClick={onRemove}>
              Remove this card
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
