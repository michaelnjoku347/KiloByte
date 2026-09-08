import { useEffect, useState } from 'react'
import type { GameSpec } from './types'
import { useCatalog } from './hooks/useCatalog'
import { useHashRoute } from './hooks/useHashRoute'
import { BrowsePage } from './components/BrowsePage'
import { CreatePage } from './components/CreatePage'
import { DashboardPage } from './components/DashboardPage'
import { PlayView } from './components/PlayView'
import { WhyPage } from './components/WhyPage'
import { decodeCart, formatBytes, parseCartJson } from './lib/cart'
import { recordFromCart } from './lib/record'
import { ensureGameWorker } from './lib/idb'
import { go } from './lib/route'
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

  useEffect(() => {
    void ensureGameWorker()
  }, [])

  const current =
    route.name === 'game' || route.name === 'play' ? catalog.find(route.id) : undefined

  const onImportFile = async (file: File) => {
    try {
      if (file.name.endsWith('.json')) {
        const spec = parseCartJson(await file.text())
        catalog.publishCart(spec)
        go({ name: 'game', id: spec.id })
        return
      }
      catalog.flash('Use Create → Upload for zips and HTML builds')
      go({ name: 'create', tab: 'upload' })
    } catch {
      catalog.flash('Could not import that file')
    }
  }

  return (
    <div className="shell">
      <div className="grain" aria-hidden />
      <header className="topbar">
        <button type="button" className="wordmark" onClick={() => go({ name: 'arcade' })}>
          <span>Kilobyte</span>
          <small>Arcade</small>
        </button>
        <nav className="nav">
          <button
            type="button"
            className={route.name === 'arcade' ? 'on' : ''}
            onClick={() => go({ name: 'arcade' })}
          >
            Arcade
          </button>
          <button
            type="button"
            className={route.name === 'create' ? 'on' : ''}
            onClick={() => go({ name: 'create', tab: 'upload' })}
          >
            Create
          </button>
          <button
            type="button"
            className={route.name === 'why' ? 'on' : ''}
            onClick={() => go({ name: 'why' })}
          >
            Hosting
          </button>
        </nav>
        <div className="top-meta">
          <span className="pill">{formatBytes(catalog.bytes)}</span>
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
        </div>
      </header>

      <main>
        {route.name === 'arcade' && (
          <BrowsePage
            all={catalog.all}
            mineIds={catalog.mineIds}
            plays={catalog.plays}
            bytes={catalog.bytes}
            onRemove={(id) => void catalog.remove(id)}
          />
        )}
        {route.name === 'create' && (
          <CreatePage
            tab={route.tab}
            settings={catalog.settings}
            onSettings={catalog.setSettings}
            onPublishCart={catalog.publishCart}
            onPublishGame={catalog.publish}
            flash={catalog.flash}
          />
        )}
        {route.name === 'why' && <WhyPage carts={catalog.all} />}
        {route.name === 'game' && current && (
          <DashboardPage
            game={current}
            all={catalog.all}
            plays={catalog.plays[current.id] ?? 0}
            mine={catalog.mineIds.has(current.id)}
            onRemove={() => {
              void catalog.remove(current.id)
              go({ name: 'arcade' })
            }}
            onPlay={() => {
              catalog.bumpPlays(current.id)
              go({ name: 'play', id: current.id })
            }}
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
          <p className="empty pad">Game missing on this device. Upload it again or open the GitHub listing.</p>
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
        <span>Dashboards + GitHub + uploads · you do not host the binaries</span>
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
