import { useEffect, useState } from 'react'
import type { GameSpec } from './types'
import { useArcade } from './hooks/useArcade'
import { useHashRoute } from './hooks/useHashRoute'
import { ArcadePage } from './components/ArcadePage'
import { StudioPage } from './components/StudioPage'
import { PlayPage } from './components/PlayPage'
import { WhyPage } from './components/WhyPage'
import { decodeCart, formatBytes, parseCartJson } from './lib/cart'
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
  return <PlayPage spec={spec} author={author} guest onSave={onSave} flash={flash} />
}

function App() {
  const arcade = useArcade()
  const route = useHashRoute()
  const playSpec = route.name === 'play' ? arcade.find(route.id) : undefined

  const onImportFile = async (file: File) => {
    try {
      const spec = parseCartJson(await file.text())
      arcade.publish(spec)
      go({ name: 'play', id: spec.id })
    } catch {
      arcade.flash('Could not import that JSON cart')
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
          <button type="button" className={route.name === 'arcade' ? 'on' : ''} onClick={() => go({ name: 'arcade' })}>
            Arcade
          </button>
          <button type="button" className={route.name === 'studio' ? 'on' : ''} onClick={() => go({ name: 'studio' })}>
            Studio
          </button>
          <button type="button" className={route.name === 'why' ? 'on' : ''} onClick={() => go({ name: 'why' })}>
            Why it’s free
          </button>
        </nav>
        <div className="top-meta">
          <span className="pill">{formatBytes(arcade.bytes)}</span>
          <label className="import-btn">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
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
          <ArcadePage
            all={arcade.all}
            mine={arcade.mine}
            bytes={arcade.bytes}
            onRemove={arcade.remove}
          />
        )}
        {route.name === 'studio' && (
          <StudioPage
            settings={arcade.settings}
            onSettings={arcade.setSettings}
            onPublish={arcade.publish}
            flash={arcade.flash}
          />
        )}
        {route.name === 'why' && <WhyPage carts={arcade.all} />}
        {route.name === 'play' && playSpec && (
          <PlayPage
            spec={playSpec}
            author={arcade.settings.author}
            onSave={arcade.publish}
            flash={arcade.flash}
          />
        )}
        {route.name === 'play' && !playSpec && (
          <p className="empty pad">Cart missing. It may only exist on another device.</p>
        )}
        {route.name === 'share' && (
          <SharedCart
            key={route.payload}
            payload={route.payload}
            author={arcade.settings.author}
            onSave={arcade.publish}
            flash={arcade.flash}
          />
        )}
      </main>

      <footer className="footer">
        <span>Recipes in JSON · engine in the page · $0 storage architecture</span>
        <span>{arcade.all.length} carts on this cabinet</span>
      </footer>
      {arcade.toast && (
        <div className="toast" role="status">
          {arcade.toast}
        </div>
      )}
    </div>
  )
}

export default App
