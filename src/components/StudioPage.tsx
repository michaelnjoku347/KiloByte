import { useState } from 'react'
import type { ArcadeSettings, GameSpec } from '../types'
import { compileCart } from '../lib/generate'
import { composeWithGemini } from '../lib/gemini'
import { cartBytes, encodeCart, formatBytes, shareUrl } from '../lib/cart'
import { go } from '../lib/route'
import { downloadTextFile } from '../lib/download'

const PROMPTS = [
  'a neon snake in a candy factory',
  'space collector with angry comets',
  'cozy forest platformer with owls',
  'dungeon breakout made of lantern bricks',
  'cyber dodge rain over a wet alley',
]

export function StudioPage({
  settings,
  onSettings,
  onPublish,
  flash,
}: {
  settings: ArcadeSettings
  onSettings: (settings: ArcadeSettings) => void
  onPublish: (spec: GameSpec) => void
  flash: (message: string) => void
}) {
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [useModel, setUseModel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState<'device' | 'model' | null>(null)
  const [spec, setSpec] = useState<GameSpec | null>(null)

  const mint = async () => {
    setBusy(true)
    try {
      if (useModel && settings.geminiKey.trim()) {
        try {
          const next = await composeWithGemini(prompt, settings.author, settings.geminiKey)
          setSpec(next)
          setSource('model')
          flash('Model wrote the cart')
          return
        } catch {
          const next = compileCart({ prompt, author: settings.author })
          setSpec(next)
          setSource('device')
          flash('Model failed — used the on-device composer')
          return
        }
      }
      const next = compileCart({ prompt, author: settings.author })
      setSpec(next)
      setSource('device')
      flash('Cart minted on this device')
    } finally {
      setBusy(false)
    }
  }

  const publish = () => {
    if (!spec) return
    onPublish(spec)
    go({ name: 'play', id: spec.id })
  }

  const copyLink = async () => {
    if (!spec) return
    const payload = await encodeCart(spec)
    const url = shareUrl(payload)
    await navigator.clipboard.writeText(url)
    flash('Share link copied — the whole game is in the URL')
  }

  return (
    <div className="page studio-page">
      <section className="hero compact">
        <p className="eyebrow">Studio</p>
        <h1>Write a wish. Get a cart.</h1>
        <p className="lede">
          Generation runs in your browser so the site owner pays nothing for inference.
          Optional Gemini uses <em>your</em> free-tier key, never a server bill.
        </p>
      </section>

      <div className="studio-grid">
        <section className="panel">
          <label className="field">
            <span>Player name on the label</span>
            <input
              value={settings.author}
              onChange={(e) => onSettings({ ...settings, author: e.target.value })}
              placeholder="Anonymous"
            />
          </label>
          <label className="field">
            <span>Describe the game</span>
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="a tiny ocean collector with sharks"
            />
          </label>
          <div className="prompt-row">
            {PROMPTS.map((p) => (
              <button key={p} type="button" className="chip" onClick={() => setPrompt(p)}>
                {p}
              </button>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={useModel}
              onChange={(e) => setUseModel(e.target.checked)}
            />
            Try Gemini with my own API key
          </label>
          {useModel && (
            <label className="field">
              <span>Gemini key stays in this browser</span>
              <input
                type="password"
                autoComplete="off"
                value={settings.geminiKey}
                onChange={(e) => onSettings({ ...settings, geminiKey: e.target.value })}
                placeholder="AIza…"
              />
            </label>
          )}
          <button type="button" className="primary-btn" disabled={busy} onClick={() => void mint()}>
            {busy ? 'Minting…' : 'Mint cart'}
          </button>
        </section>

        <section className="panel recipe">
          {!spec && <p className="empty">Your recipe will land here. Typical cart: 1–2 KB.</p>}
          {spec && (
            <>
              <header className="recipe-head">
                <div>
                  <p className="eyebrow">{source === 'model' ? 'Gemini draft' : 'On-device composer'}</p>
                  <h2>{spec.title}</h2>
                </div>
                <strong className="size-pill">{formatBytes(cartBytes(spec))}</strong>
              </header>
              <p>{spec.blurb}</p>
              <dl className="spec-dl">
                <div>
                  <dt>Genre</dt>
                  <dd>{spec.genre}</dd>
                </div>
                <div>
                  <dt>Theme</dt>
                  <dd>{spec.theme}</dd>
                </div>
                <div>
                  <dt>Goal</dt>
                  <dd>
                    {spec.goal.kind} {spec.goal.target}
                  </dd>
                </div>
                <div>
                  <dt>Swarm</dt>
                  <dd>
                    {spec.swarm.count} {spec.swarm.behavior}
                  </dd>
                </div>
              </dl>
              <pre className="json-peek">{JSON.stringify(spec, null, 2)}</pre>
              <div className="hero-actions">
                <button type="button" className="primary-btn" onClick={publish}>
                  Publish to arcade
                </button>
                <button type="button" className="ghost-btn" onClick={() => void copyLink()}>
                  Copy share link
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() =>
                    downloadTextFile(`${spec.id}.json`, JSON.stringify(spec, null, 2), 'application/json')
                  }
                >
                  Download JSON
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
