import { useEffect, useState } from 'react'
import type { GameRecord } from '../types'
import { Cabinet } from './Cabinet'
import { encodeCart, formatBytes, shareUrl } from '../lib/cart'
import { playUrlFor, sourceLabel } from '../lib/record'
import { remixCart } from '../lib/generate'
import { recordFromCart } from '../lib/record'
import { ensureGameWorker } from '../lib/idb'
import { go } from '../lib/route'

export function PlayView({
  game,
  author,
  guest,
  onSaveRecord,
  flash,
}: {
  game: GameRecord
  author: string
  guest?: boolean
  onSaveRecord: (game: GameRecord) => void
  flash: (message: string) => void
}) {
  const spec = game.source.kind === 'cart' ? game.source.spec : undefined
  const iframe = playUrlFor(game)
  const [copied, setCopied] = useState(false)
  const [frameError, setFrameError] = useState(false)

  useEffect(() => {
    if (game.source.kind === 'upload') void ensureGameWorker()
  }, [game])

  const copy = async () => {
    if (spec) {
      await navigator.clipboard.writeText(shareUrl(await encodeCart(spec)))
      setCopied(true)
      flash('Cart link copied')
      return
    }
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}${toGameHash(game.id)}`)
    setCopied(true)
    flash('Experience link copied')
  }

  const remix = () => {
    if (!spec) return
    const next = remixCart(spec, author)
    onSaveRecord(recordFromCart(next))
    go({ name: 'play', id: next.id })
  }

  return (
    <div className="page play-page">
      <div className="play-head">
        <button type="button" className="ghost-btn" onClick={() => go({ name: 'game', id: game.id })}>
          ← Experience
        </button>
        <div>
          <p className="eyebrow">
            {game.genres.join(' · ')} · {sourceLabel(game.source)}
            {game.bytes ? ` · ${formatBytes(game.bytes)}` : ''}
            {guest ? ' · from a link' : ''}
          </p>
          <h1>{game.title}</h1>
          <p>{game.blurb}</p>
        </div>
        <div className="hero-actions wrap">
          {guest && spec && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onSaveRecord(game)
                go({ name: 'play', id: game.id })
              }}
            >
              Save to my arcade
            </button>
          )}
          <button type="button" className="ghost-btn" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {spec && (
            <button type="button" className="ghost-btn" onClick={remix}>
              Remix
            </button>
          )}
          {iframe && (
            <a className="ghost-btn link-btn" href={iframe} target="_blank" rel="noreferrer">
              New tab
            </a>
          )}
        </div>
      </div>

      {spec && <Cabinet spec={spec} />}
      {!spec && iframe && (
        <RemoteFrame title={game.title} url={iframe} onFail={() => setFrameError(true)} />
      )}
      {frameError && iframe && (
        <p className="empty">
          Embed blocked.{' '}
          <a href={iframe} target="_blank" rel="noreferrer">
            Open the build in a new tab
          </a>
        </p>
      )}
      {spec && (
        <p className="controls-help">
          Move with arrows or WASD. Space fires, jumps, or starts.
        </p>
      )}
    </div>
  )
}

function toGameHash(id: string): string {
  return `#/game/${id}`
}

function RemoteFrame({
  title,
  url,
  onFail,
}: {
  title: string
  url: string
  onFail: () => void
}) {
  const useDirect = /github\.io\/|localhost|\/games\/|\/local-game\//.test(url)
  const [srcdoc, setSrcdoc] = useState<string | null>(null)

  useEffect(() => {
    if (useDirect) return
    let alive = true
    void fetch(url)
      .then((res) => res.text())
      .then((html) => {
        if (!alive) return
        const base = url.replace(/[^/]*$/, '')
        const injected = /<base /i.test(html)
          ? html
          : html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`)
        setSrcdoc(injected)
      })
      .catch(() => {
        if (alive) onFail()
      })
    return () => {
      alive = false
    }
  }, [url, useDirect])

  return (
    <div className="frame-shell">
      <iframe
        className="game-frame"
        title={title}
        src={useDirect ? url : undefined}
        srcDoc={!useDirect && srcdoc ? srcdoc : undefined}
        sandbox="allow-scripts allow-pointer-lock allow-forms allow-modals allow-same-origin allow-downloads"
        allow="gamepad; fullscreen"
      />
    </div>
  )
}
