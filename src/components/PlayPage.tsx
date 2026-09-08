import { useState } from 'react'
import type { GameSpec } from '../types'
import { Cabinet } from './Cabinet'
import { cartBytes, encodeCart, formatBytes, shareUrl } from '../lib/cart'
import { remixCart } from '../lib/generate'
import { go } from '../lib/route'

export function PlayPage({
  spec,
  author,
  guest,
  onSave,
  flash,
}: {
  spec: GameSpec
  author: string
  guest?: boolean
  onSave: (spec: GameSpec) => void
  flash: (message: string) => void
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copied = copiedId === spec.id

  const copy = async () => {
    const url = shareUrl(await encodeCart(spec))
    await navigator.clipboard.writeText(url)
    setCopiedId(spec.id)
    flash('The cart is the link. No upload.')
  }

  const remix = () => {
    const next = remixCart(spec, author)
    onSave(next)
    go({ name: 'play', id: next.id })
  }

  return (
    <div className="page play-page">
      <div className="play-head">
        <button type="button" className="ghost-btn" onClick={() => go({ name: 'arcade' })}>
          ← Arcade
        </button>
        <div>
          <p className="eyebrow">
            {spec.genre} · {spec.theme} · {formatBytes(cartBytes(spec))}
            {guest ? ' · from a link' : spec.house ? ' · house cart' : ` · ${spec.author}`}
          </p>
          <h1>{spec.title}</h1>
          <p>{spec.blurb}</p>
        </div>
        <div className="hero-actions wrap">
          {guest && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onSave(spec)
                go({ name: 'play', id: spec.id })
              }}
            >
              Save to my arcade
            </button>
          )}
          <button type="button" className="ghost-btn" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy share link'}
          </button>
          <button type="button" className="ghost-btn" onClick={remix}>
            Remix
          </button>
        </div>
      </div>
      <Cabinet spec={spec} />
      <p className="controls-help">
        Move with arrows or WASD. Space fires, jumps, or starts. Touch the pad on a phone.
      </p>
    </div>
  )
}
