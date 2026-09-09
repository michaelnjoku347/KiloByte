import { useEffect, useState } from 'react'
import type { GameSpec } from './types'
import { useCatalog } from './hooks/useCatalog'
import { useHashRoute } from './hooks/useHashRoute'
import { DiscoverPage } from './components/DiscoverPage'
import { ChartsPage } from './components/ChartsPage'
import { CreatePage } from './components/CreatePage'
import { DashboardPage } from './components/DashboardPage'
import { PlayView } from './components/PlayView'
import { WhyPage } from './components/WhyPage'
import { ProfilePage } from './components/ProfilePage'
import { decodeCart, parseCartJson } from './lib/cart'
import { recordFromCart } from './lib/record'
import { ensureGameWorker } from './lib/idb'
import { go, parseHash } from './lib/route'
import { initialsFrom } from './lib/profile'
import './App.css'

function SharedCart({
  payload,
  author,
  onSave,
  flash,
}: {
  payload: string
  author: string
  onSave: (spec: GameSpec) => void
  flash: (message: string) => void
}) {
  const [spec, setSpec] = useState<GameSpec | 'err' | null>(null)

  useEffect(() => {
    let alive = true
    void decodeCart(payload)
      .then((next) => {
        if (alive) setSpec(next)
      })
      .catch(() => {
        if (alive) setSpec('err')
      })
    return () => {
      alive = false
    }
  }, [payload])

  if (spec === 'err') {
    return <p className="empty pad">That share link is not a readable cart.</p>
  }
  if (!spec) return <p className="empty pad">Unpacking cart…</p>
  return (
    <PlayView
      game={recordFromCart(spec)}
      author={author}
      guest
      onSaveRecord={(game) => {
        if (game.source.kind === 'cart') onSave(game.source.spec)
      }}
      flash={flash}
    />
  )
}

function App() {
  const catalog = useCatalog()
  const route = useHashRoute()
  const [q, setQ] = useState(() => {
    const start = parseHash(typeof location === 'undefined' ? '' : location.hash)
    return start.name === 'search' ? start.query : ''
  })

  useEffect(() => {
    void ensureGameWorker()
  }, [])

  const current =
    route.name === 'game' || route.name === 'play' ? catalog.find(route.id) : undefined

  const play = (id: string) => {
    catalog.bumpPlays(id)
    go({ name: 'play', id })
  }

  const onImportFile = async (file: File) => {
    try {
      if (file.name.endsWith('.json')) {
        const spec = parseCartJson(await file.text())
        catalog.publishCart(spec)
        go({ name: 'game', id: spec.id })
        return
      }
      catalog.flash('Use Make → Upload for zips and HTML builds')
      go({ name: 'create', tab: 'upload' })
    } catch {
      catalog.flash('Could not import that file')
    }
  }

  const initials = catalog.signedIn && catalog.profile
    ? initialsFrom(catalog.profile.displayName)
    : '?'

  return (
    <div className="shell" data-theme={catalog.settings.theme}>
      <header className="topbar">
        <button type="button" className="wordmark" onClick={() => go({ name: 'arcade' })}>
          <span>Kilobyte</span>
          <small>games</small>
        </button>
        <nav className="nav">
          <button
            type="button"
            className={route.name === 'arcade' || route.name === 'search' ? 'on' : ''}
            onClick={() => go({ name: 'arcade' })}
          >
            Play
          </button>
          <button
            type="button"
            className={route.name === 'charts' ? 'on' : ''}
            onClick={() => go({ name: 'charts' })}
          >
            Catalog
          </button>
          <button
            type="button"
            className={route.name === 'create' ? 'on' : ''}
            onClick={() => go({ name: 'create', tab: 'upload' })}
          >
            Make
          </button>
          <button
            type="button"
            className={route.name === 'why' ? 'on' : ''}
            onClick={() => go({ name: 'why' })}
          >
            Hosting
          </button>
        </nav>
        <form
          className="top-search"
          onSubmit={(e) => {
            e.preventDefault()
            go({ name: 'search', query: q.trim() })
          }}
        >
          <label>
            <span className="find-label">Find</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games"
            />
          </label>
        </form>
        <div className="top-meta">
          <label className="import-btn">
            Import
            <input
              type="file"
              accept=".json,.zip,.html"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onImportFile(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className={`seal ${catalog.signedIn ? 'on' : 'guest'}`}
            title={catalog.signedIn && catalog.profile ? catalog.profile.displayName : 'You — optional card'}
            onClick={() => go({ name: 'you' })}
          >
            {initials}
          </button>
        </div>
      </header>

      <main>
        {route.name === 'arcade' && (
          <DiscoverPage
            all={catalog.all}
            mineIds={catalog.mineIds}
            ratings={catalog.ratings}
            recents={catalog.recents}
            favorites={catalog.favorites}
            onPlay={play}
          />
        )}
        {route.name === 'search' && (
          <DiscoverPage
            all={catalog.all}
            mineIds={catalog.mineIds}
            ratings={catalog.ratings}
            recents={catalog.recents}
            favorites={catalog.favorites}
            searchQuery={route.query}
            onPlay={play}
          />
        )}
        {route.name === 'charts' && (
          <ChartsPage all={catalog.all} ratings={catalog.ratings} genre={route.genre} onPlay={play} />
        )}
        {route.name === 'create' && (
          <CreatePage
            tab={route.tab}
            settings={catalog.settings}
            signedIn={catalog.signedIn}
            onSettings={catalog.setSettings}
            onPublishCart={catalog.publishCart}
            onPublishGame={catalog.publish}
            flash={catalog.flash}
          />
        )}
        {route.name === 'why' && <WhyPage carts={catalog.all} />}
        {route.name === 'you' && (
          <ProfilePage
            signedIn={catalog.signedIn}
            profile={catalog.profile}
            theme={catalog.settings.theme}
            mine={catalog.mine}
            saved={catalog.all.filter((g) => catalog.favorites.includes(g.id))}
            ratings={catalog.ratings}
            onPlay={play}
            onSignUp={catalog.signUp}
            onSignIn={catalog.signIn}
            onSignOut={catalog.signOut}
            onUpdate={catalog.updateProfile}
            onRemove={catalog.removeProfile}
            onTheme={catalog.setTheme}
          />
        )}
        {route.name === 'game' && current && (
          <DashboardPage
            game={current}
            all={catalog.all}
            plays={catalog.plays[current.id] ?? 0}
            ratings={catalog.ratings}
            mine={catalog.mineIds.has(current.id)}
            favorited={catalog.favorites.includes(current.id)}
            onRemove={() => {
              void catalog.remove(current.id)
              go({ name: 'arcade' })
            }}
            onPlay={() => play(current.id)}
            onFavorite={() => catalog.toggleFavorite(current.id)}
            onRate={(stars) => catalog.rate(current.id, stars)}
            onPlayOther={play}
          />
        )}
        {route.name === 'play' && current && (
          <PlayView
            game={current}
            author={catalog.settings.author}
            onSaveRecord={(game) => {
              if (game.source.kind === 'cart') catalog.publishCart(game.source.spec)
              else void catalog.publish(game)
            }}
            flash={catalog.flash}
          />
        )}
        {(route.name === 'game' || route.name === 'play') && !current && (
          <p className="empty pad">That game is not on this device.</p>
        )}
        {route.name === 'share' && (
          <SharedCart
            key={route.payload}
            payload={route.payload}
            author={catalog.settings.author}
            onSave={catalog.publishCart}
            flash={catalog.flash}
          />
        )}
      </main>

      <footer className="footer">
        <span>Games stay on GitHub or the maker’s machine — this site is just the catalog</span>
        <span>{catalog.all.length} games</span>
      </footer>
      {catalog.toast && (
        <div className="toast" role="status">
          {catalog.toast}
        </div>
      )}
    </div>
  )
}

export default App
