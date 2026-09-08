import type { GameSpec } from '../types'
import { arcadeWeight } from '../lib/storage'
import { cartBytes, formatBytes } from '../lib/cart'
import { go } from '../lib/route'

export function WhyPage({ carts }: { carts: GameSpec[] }) {
  const ourBytes = arcadeWeight(carts)
  const fakeBuild = 40 * 1024 * 1024
  const thousandCarts = Math.round((ourBytes / Math.max(carts.length, 1)) * 1000)

  return (
    <div className="page why-page">
      <section className="hero compact">
        <p className="eyebrow">Storage, not slogans</p>
        <h1>Store the recipe. Share the engine.</h1>
        <p className="lede">
          The expensive part of “user-generated games” is almost never the idea. It is
          uploading megabyte binaries, transcoding previews, and paying a database to
          remember them. Kilobyte refuses that shape.
        </p>
      </section>

      <div className="compare">
        <article className="panel stat-card warn-card">
          <p className="eyebrow">Typical web game build</p>
          <strong>{formatBytes(fakeBuild)}</strong>
          <p>One Unity WebGL drop. Hosting, CDN, and backups start charging immediately.</p>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">This arcade right now</p>
          <strong>{formatBytes(ourBytes)}</strong>
          <p>
            {carts.length} playable carts as JSON. Average{' '}
            {formatBytes(Math.round(ourBytes / Math.max(carts.length, 1)))} each.
          </p>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">1,000 published carts</p>
          <strong>{formatBytes(thousandCarts)}</strong>
          <p>Still smaller than a single compressed screenshot. Fits in a free GitHub repo.</p>
        </article>
      </div>

      <ol className="layers">
        <li>
          <h2>1. One engine, many saves</h2>
          <p>
            Players never download a unique game runtime. They download this website once.
            Each published game is a <code>GameSpec</code> — genre, palette, speeds, goal —
            usually one or two kilobytes. That is the whole storage trick.
          </p>
        </li>
        <li>
          <h2>2. House arcade is a static file</h2>
          <p>
            Featured carts ship inside the frontend bundle. Host the site on GitHub Pages
            or Cloudflare Pages and the catalog costs nothing. No API, no S3 bucket, no
            Postgres.
          </p>
        </li>
        <li>
          <h2>3. Player carts live on the player’s machine</h2>
          <p>
            Publish writes to <code>localStorage</code> under <code>kilobyte.arcade.v1</code>.
            Five megabytes is thousands of carts. You are not paying to remember their
            drafts.
          </p>
        </li>
        <li>
          <h2>4. Distribution is a gzipped URL</h2>
          <p>
            A share link encodes the cart into the hash. Whoever opens it can play and
            optionally save. There is no upload step, so there is no storage invoice when
            a game goes viral — the bytes travel with the link.
          </p>
        </li>
      </ol>

      <section className="panel">
        <h2>What this will not store</h2>
        <p>
          Full 3D worlds, downloaded MP4 trailers, and per-user video of play sessions
          would blow the budget. If you ever need a global searchable database, keep
          storing recipes: put JSON objects in Cloudflare R2 or even a GitHub repo. A
          million 2 KB carts is about 2 GB — still cheaper than a weekend of asset
          hosting.
        </p>
        <p className="meter-line">
          Smallest cart in this cabinet: {formatBytes(Math.min(...carts.map(cartBytes)))}
        </p>
        <button type="button" className="primary-btn" onClick={() => go({ name: 'studio' })}>
          Mint a cheap cart
        </button>
      </section>
    </div>
  )
}
