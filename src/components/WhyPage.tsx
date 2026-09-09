import type { GameRecord } from '../types'
import { formatBytes } from '../lib/cart'
import { localWeight } from '../lib/storage'
import { go } from '../lib/route'

export function WhyPage({ carts }: { carts: GameRecord[] }) {
  const local = localWeight(carts)
  const github = carts.filter((g) => g.source.kind === 'github').length
  const uploads = carts.filter((g) => g.source.kind === 'upload').length
  const fakeBuild = 40 * 1024 * 1024

  return (
    <div className="page why-page">
      <section className="hero compact">
        <p className="eyebrow">Launch storage</p>
        <h1>You do not host the games. You host the catalog.</h1>
        <p className="lede">
          Kilobyte is a paper catalog plus a player. The expensive files live on GitHub
          or on the maker’s machine. That is how this stays free when people publish
          simulators, shooters, puzzles — anything.
        </p>
      </section>

      <div className="compare">
        <article className="panel stat-card warn-card">
          <p className="eyebrow">If you stored every build</p>
          <strong>{formatBytes(fakeBuild)}</strong>
          <p>One WebGL drop. A real catalog of those becomes a bill.</p>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">What this cabinet holds locally</p>
          <strong>{formatBytes(local)}</strong>
          <p>
            {carts.length} listings · {github} GitHub-hosted · {uploads} device uploads
          </p>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">GitHub-connected game on your server</p>
          <strong>0 B</strong>
          <p>Metadata only. The repo is the CDN.</p>
        </article>
      </div>

      <ol className="layers">
        <li>
          <h2>1. Connect a GitHub repo</h2>
          <p>
            Creators paste <code>owner/repo</code>. We read the public API, find{' '}
            <code>index.html</code>, and play through jsDelivr or GitHub Pages. You never
            receive a zip.
          </p>
        </li>
        <li>
          <h2>2. Uploads stay in their browser</h2>
          <p>
            HTML, folders, or a zip go into IndexedDB and play through a service worker
            at <code>/local-game/…</code>. That is their disk, not your invoice.
          </p>
        </li>
        <li>
          <h2>3. Tiny carts still exist</h2>
          <p>
            Prompt-minted JSON games are for people who want a one-kilobyte recipe. Full
            games should be Upload or GitHub.
          </p>
        </li>
        <li>
          <h2>4. Dashboards are text</h2>
          <p>
            Title, genres, description, play counts. Search and filter run on that text.
            A million dashboards is still cheap. A million binaries is not.
          </p>
        </li>
      </ol>

      <section className="panel">
        <h2>How to launch this site</h2>
        <p>
          This is a static Vite app. Build it and put <code>dist/</code> on GitHub Pages
          or Cloudflare Pages. No API keys required for the public cabinet. Optional
          Gemini and GitHub tokens are typed by the visitor and stored locally.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-btn" onClick={() => go({ name: 'create', tab: 'github' })}>
            Connect a repo
          </button>
          <button type="button" className="ghost-btn" onClick={() => go({ name: 'create', tab: 'upload' })}>
            Upload a build
          </button>
        </div>
      </section>
    </div>
  )
}
