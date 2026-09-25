import { useEffect, useRef, useState } from 'react'
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
import { go, pageTitle, parseHash, toHash } from './lib/route'
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
  const searchRef = useRef<HTMLInputElement>(null)
  const skipSearchSync = useRef(false)

  const commitSearch = (query: string, replace: boolean) => {
    const trimmed = query.trim()
    const next = trimmed ? ({ name: 'search' as const, query: trimmed }) : ({ name: 'arcade' as const })
    if (toHash(next) === location.hash) return
    skipSearchSync.current = true
    go(next, { replace })
  }

  useEffect(() => {
    void ensureGameWorker()
  }, [])

  useEffect(() => {
    const onHash = () => {
      if (skipSearchSync.current) {
        skipSearchSync.current = false
        return
      }
      const next = parseHash(location.hash)
      if (next.name === 'search') setQ(next.query)
      else setQ('')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const trimmed = q.trim()
    const here = parseHash(location.hash)
    const currentQuery = here.name === 'search' ? here.query : ''
    if (trimmed === currentQuery) return
    if (!trimmed && here.name !== 'search') return
    const id = window.setTimeout(() => commitSearch(q, true), 220)
    return () => window.clearTimeout(id)
  }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (e.key !== '/' || meta || e.altKey) return
      const target = e.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return
      }
      if (target instanceof HTMLElement && target.isContentEditable) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current =
    route.name === 'game' || route.name === 'play' ? catalog.find(route.id) : undefined

  useEffect(() => {
    document.title = pageTitle(route, current?.title)
  }, [route, current?.title])

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
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to games
      </a>
      <header className="topbar">
        <button type="button" className="wordmark" onClick={() => go({ name: 'arcade' })}>
          <span>Kilobyte</span>
          <small>games</small>
        </button>
        <nav className="nav" aria-label="Primary">
          <button
            type="button"
            className={route.name === 'arcade' || route.name === 'search' ? 'on' : ''}
            aria-current={route.name === 'arcade' || route.name === 'search' ? 'page' : undefined}
            onClick={() => go({ name: 'arcade' })}
          >
            Play
          </button>
          <button
            type="button"
            className={route.name === 'charts' ? 'on' : ''}
            aria-current={route.name === 'charts' ? 'page' : undefined}
            onClick={() => go({ name: 'charts' })}
          >
            Catalog
          </button>
          <button
            type="button"
            className={route.name === 'create' ? 'on' : ''}
            aria-current={route.name === 'create' ? 'page' : undefined}
            onClick={() => go({ name: 'create', tab: 'upload' })}
          >
            Make
          </button>
          <button
            type="button"
            className={route.name === 'why' ? 'on' : ''}
            aria-current={route.name === 'why' ? 'page' : undefined}
            onClick={() => go({ name: 'why' })}
          >
            Hosting
          </button>
        </nav>
        <form
          className="top-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            commitSearch(q, false)
          }}
        >
          <label>
            <span className="find-label sr-only">Search</span>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games"
              autoComplete="off"
              enterKeyHint="search"
              name="q"
            />
            {q ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQ('')
                  if (route.name === 'search') commitSearch('', true)
                }}
              >
                ×
              </button>
            ) : null}
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

      <main id="main" tabIndex={-1}>
        {route.name === 'arcade' && (
          <DiscoverPage
            all={catalog.all}
            mineIds={catalog.mineIds}
            ratings={catalog.ratings}
            recents={catalog.recents}
            favorites={catalog.favorites}
            onPlay={play}
            onSave={catalog.toggleFavorite}
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
            onSave={catalog.toggleFavorite}
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
            favorites={catalog.favorites}
            onPlay={play}
            onSave={catalog.toggleFavorite}
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
            favorites={catalog.favorites}
            onRemove={() => {
              void catalog.remove(current.id)
              go({ name: 'arcade' })
            }}
            onPlay={() => play(current.id)}
            onFavorite={() => catalog.toggleFavorite(current.id)}
            onRate={(stars) => catalog.rate(current.id, stars)}
            onPlayOther={play}
            onSaveOther={catalog.toggleFavorite}
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
