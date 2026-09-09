import { useState } from 'react'
import type { ArcadeSettings, CreateTab, GameRecord, GameSpec } from '../types'
import type { BundleFile } from '../lib/bundle'
import type { GithubInspect } from '../lib/github'
import { compileCart } from '../lib/generate'
import { composeWithGemini } from '../lib/gemini'
import { cartBytes, encodeCart, formatBytes, shareUrl } from '../lib/cart'
import { inspectGithub, jsdelivrUrl } from '../lib/github'
import { bundleBytes, filesFromList, findEntry } from '../lib/bundle'
import { parseGenreList } from '../lib/genres'
import { uid } from '../lib/hash'
import { go } from '../lib/route'
import { downloadTextFile } from '../lib/download'
import { GenrePicker } from './GenrePicker'

export function CreatePage({
  tab,
  settings,
  signedIn,
  onSettings,
  onPublishCart,
  onPublishGame,
  flash,
}: {
  tab: CreateTab
  settings: ArcadeSettings
  signedIn: boolean
  onSettings: (settings: ArcadeSettings) => void
  onPublishCart: (spec: GameSpec) => void
  onPublishGame: (game: GameRecord, files?: BundleFile[]) => Promise<void>
  flash: (message: string) => void
}) {
  return (
    <div className="page studio-page">
      <section className="hero compact">
        <p className="eyebrow">Make</p>
        <h1>Publish a game. We store a pointer.</h1>
        <p className="lede">
          Upload an HTML5 build, connect the GitHub repo that already hosts it, or mint a
          tiny JSON cart. Kilobyte keeps the listing; your files stay cheap.
        </p>
      </section>
      <div className="filters create-tabs" role="tablist" aria-label="Create method">
        {([
          ['upload', 'Upload files'],
          ['github', 'Connect GitHub'],
          ['generate', 'Mint a cart'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'on' : ''}
            onClick={() => go({ name: 'create', tab: id })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'upload' && (
        <UploadForm
          settings={settings}
          signedIn={signedIn}
          onSettings={onSettings}
          onPublishGame={onPublishGame}
          flash={flash}
        />
      )}
      {tab === 'github' && (
        <GithubForm
          settings={settings}
          signedIn={signedIn}
          onSettings={onSettings}
          onPublishGame={onPublishGame}
          flash={flash}
        />
      )}
      {tab === 'generate' && (
        <GenerateForm
          settings={settings}
          signedIn={signedIn}
          onSettings={onSettings}
          onPublishCart={onPublishCart}
          flash={flash}
        />
      )}
    </div>
  )
}

function PublisherName({
  settings,
  signedIn,
  onSettings,
}: {
  settings: ArcadeSettings
  signedIn: boolean
  onSettings: (settings: ArcadeSettings) => void
}) {
  if (signedIn) {
    return (
      <p className="meter-line publisher-line">
        Publishing as <strong>{settings.author}</strong>
        {' · '}
        <button type="button" className="text-btn" onClick={() => go({ name: 'you' })}>
          Your card
        </button>
      </p>
    )
  }
  return (
    <label className="field">
      <span>Your name on the card</span>
      <input
        value={settings.author}
        onChange={(e) => onSettings({ ...settings, author: e.target.value })}
      />
    </label>
  )
}

function UploadForm({
  settings,
  signedIn,
  onSettings,
  onPublishGame,
  flash,
}: {
  settings: ArcadeSettings
  signedIn: boolean
  onSettings: (settings: ArcadeSettings) => void
  onPublishGame: (game: GameRecord, files?: BundleFile[]) => Promise<void>
  flash: (message: string) => void
}) {
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>(['Arcade'])
  const [files, setFiles] = useState<BundleFile[]>([])
  const [entry, setEntry] = useState('index.html')
  const [busy, setBusy] = useState(false)

  const ingest = async (list: File[]) => {
    try {
      const next = await filesFromList(list)
      const found = findEntry(next.map((f) => f.path))
      setFiles(next)
      setEntry(found)
      if (!title.trim()) {
        const hint = list[0]?.name.replace(/\.(zip|html)$/i, '') ?? 'Untitled'
        setTitle(hint)
      }
      flash(`${next.length} files · entry ${found}`)
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Could not read those files')
    }
  }

  const publish = async () => {
    if (!files.length || !title.trim()) {
      flash('Add files and a title')
      return
    }
    setBusy(true)
    try {
      const id = uid('upl')
      await onPublishGame(
        {
          id,
          title: title.trim(),
          author: settings.author,
          blurb: blurb.trim() || 'Uploaded HTML5 build',
          description: description.trim() || blurb.trim() || 'Uploaded to this cabinet.',
          genres: genres.length ? genres : ['Arcade'],
          createdAt: new Date().toISOString(),
          cover: '#e85d3a',
          palette: { bg: '#221910', paper: '#f3ead7', accent: '#e85d3a' },
          bytes: bundleBytes(files),
          rating: 0,
          source: { kind: 'upload', entry },
        },
        files,
      )
      go({ name: 'game', id })
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-grid">
      <section className="panel">
        <PublisherName settings={settings} signedIn={signedIn} onSettings={onSettings} />
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void ingest([...e.dataTransfer.files])
          }}
        >
          <strong>Drop a zip, index.html, or a whole folder</strong>
          <p>HTML, JS, CSS, images, audio. 25 MB max. Played from this browser via IndexedDB.</p>
          <label className="primary-btn file-btn">
            Choose files
            <input
              type="file"
              multiple
              className="sr-only"
              data-testid="upload-files"
              accept=".zip,.html,.htm,.js,.css,.json,.png,.jpg,.gif,.svg,.webp,.mp3,.wav"
              onChange={(e) => {
                const list = [...(e.target.files ?? [])]
                if (list.length) void ingest(list)
                e.target.value = ''
              }}
            />
          </label>
          <label className="ghost-btn file-btn">
            Choose folder
            <input
              type="file"
              className="sr-only"
              multiple
              {...{ webkitdirectory: '' }}
              onChange={(e) => {
                const list = [...(e.target.files ?? [])]
                if (list.length) void ingest(list)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {files.length > 0 && (
          <div className="file-list">
            <p className="meter-line">
              {files.length} files · {formatBytes(bundleBytes(files))} · entry {entry}
            </p>
            <ul>
              {files.slice(0, 8).map((f) => (
                <li key={f.path}>{f.path}</li>
              ))}
              {files.length > 8 && <li>+{files.length - 8} more</li>}
            </ul>
          </div>
        )}
      </section>
      <section className="panel">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dock nights" />
        </label>
        <label className="field">
          <span>Short blurb</span>
          <input value={blurb} onChange={(e) => setBlurb(e.target.value)} />
        </label>
        <label className="field">
          <span>Dashboard description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <GenrePicker value={genres} onChange={setGenres} />
        <button type="button" className="primary-btn" disabled={busy} onClick={() => void publish()}>
          {busy ? 'Publishing…' : 'Publish to arcade'}
        </button>
      </section>
    </div>
  )
}

function GithubForm({
  settings,
  signedIn,
  onSettings,
  onPublishGame,
  flash,
}: {
  settings: ArcadeSettings
  signedIn: boolean
  onSettings: (settings: ArcadeSettings) => void
  onPublishGame: (game: GameRecord, files?: BundleFile[]) => Promise<void>
  flash: (message: string) => void
}) {
  const [repo, setRepo] = useState('gabrielecirulli/2048')
  const [inspect, setInspect] = useState<GithubInspect | null>(null)
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>(['Puzzle'])
  const [usePages, setUsePages] = useState(true)
  const [busy, setBusy] = useState(false)

  const look = async () => {
    setBusy(true)
    try {
      const next = await inspectGithub(repo, settings.githubToken)
      setInspect(next)
      setTitle(next.name)
      setBlurb(next.description || `${next.ref.owner}/${next.ref.repo}`)
      setDescription(
        next.description ||
          `Played from GitHub ${next.ref.owner}/${next.ref.repo}@${next.ref.branch}. Files stay on GitHub.`,
      )
      const fromTopics = parseGenreList(next.topics.join(','))
      if (fromTopics.length) setGenres(fromTopics)
      flash(`Found ${next.entry} · ${next.stars} stars`)
    } catch (err) {
      setInspect(null)
      flash(err instanceof Error ? err.message : 'GitHub inspect failed')
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    if (!inspect) {
      flash('Inspect the repo first')
      return
    }
    const id = `gh_${inspect.ref.owner}_${inspect.ref.repo}`.replace(/[^a-zA-Z0-9_]+/g, '_')
    await onPublishGame({
      id,
      title: title.trim() || inspect.name,
      author: settings.author,
      blurb: blurb.trim() || inspect.description || 'GitHub game',
      description: description.trim(),
      genres: genres.length ? genres : ['Arcade'],
      createdAt: new Date().toISOString(),
      cover: '#c6f26d',
      palette: { bg: '#101014', paper: '#f4f1ea', accent: '#c6f26d' },
      bytes: 0,
      rating: 0,
      source: {
        kind: 'github',
        owner: inspect.ref.owner,
        repo: inspect.ref.repo,
        branch: inspect.ref.branch,
        path: inspect.ref.path,
        playUrl: usePages
          ? inspect.pagesUrl
          : jsdelivrUrl(inspect.ref, inspect.entry),
        htmlUrl: inspect.htmlUrl,
      },
    })
    go({ name: 'game', id })
  }

  return (
    <div className="studio-grid">
      <section className="panel">
        <label className="field">
          <span>GitHub repo</span>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo or github.com/owner/repo"
          />
        </label>
        <label className="field">
          <span>Optional token (stays in this browser, raises rate limits)</span>
          <input
            type="password"
            autoComplete="off"
            value={settings.githubToken}
            onChange={(e) => onSettings({ ...settings, githubToken: e.target.value })}
          />
        </label>
        <button type="button" className="primary-btn" disabled={busy} onClick={() => void look()}>
          {busy ? 'Reading repo…' : 'Inspect repo'}
        </button>
        {inspect && (
          <dl className="spec-dl">
            <div>
              <dt>Entry</dt>
              <dd>{inspect.entry}</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd>{inspect.ref.branch}</dd>
            </div>
            <div>
              <dt>Stars</dt>
              <dd>{inspect.stars}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd>{inspect.ref.path || '/'}</dd>
            </div>
          </dl>
        )}
        <label className="check">
          <input type="checkbox" checked={usePages} onChange={(e) => setUsePages(e.target.checked)} />
          Prefer GitHub Pages / homepage URL
        </label>
      </section>
      <section className="panel">
        <PublisherName settings={settings} signedIn={signedIn} onSettings={onSettings} />
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Blurb</span>
          <input value={blurb} onChange={(e) => setBlurb(e.target.value)} />
        </label>
        <label className="field">
          <span>Dashboard description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <GenrePicker value={genres} onChange={setGenres} extra={inspect?.topics ?? []} />
        <button type="button" className="primary-btn" onClick={() => void publish()}>
          Publish GitHub game
        </button>
      </section>
    </div>
  )
}

function GenerateForm({
  settings,
  signedIn,
  onSettings,
  onPublishCart,
  flash,
}: {
  settings: ArcadeSettings
  signedIn: boolean
  onSettings: (settings: ArcadeSettings) => void
  onPublishCart: (spec: GameSpec) => void
  flash: (message: string) => void
}) {
  const [prompt, setPrompt] = useState('a neon snake in a candy factory')
  const [useModel, setUseModel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [spec, setSpec] = useState<GameSpec | null>(null)

  const mint = async () => {
    setBusy(true)
    try {
      if (useModel && settings.geminiKey.trim()) {
        try {
          setSpec(await composeWithGemini(prompt, settings.author, settings.geminiKey))
          flash('Model wrote the cart')
          return
        } catch {
          flash('Model failed — used the on-device composer')
        }
      }
      setSpec(compileCart({ prompt, author: settings.author }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-grid">
      <section className="panel">
        <PublisherName settings={settings} signedIn={signedIn} onSettings={onSettings} />
        <label className="field">
          <span>Describe a cart-sized game</span>
          <textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={useModel} onChange={(e) => setUseModel(e.target.checked)} />
          Try Gemini with my key
        </label>
        {useModel && (
          <label className="field">
            <span>Gemini key</span>
            <input
              type="password"
              value={settings.geminiKey}
              onChange={(e) => onSettings({ ...settings, geminiKey: e.target.value })}
            />
          </label>
        )}
        <button type="button" className="primary-btn" disabled={busy} onClick={() => void mint()}>
          {busy ? 'Minting…' : 'Mint cart'}
        </button>
      </section>
      <section className="panel recipe">
        {!spec && <p className="empty">Carts are tiny arcade recipes. Use Upload or GitHub for full games.</p>}
        {spec && (
          <>
            <header className="recipe-head">
              <div>
                <p className="eyebrow">On-device cart</p>
                <h2>{spec.title}</h2>
              </div>
              <strong className="size-pill">{formatBytes(cartBytes(spec))}</strong>
            </header>
            <p>{spec.blurb}</p>
            <pre className="json-peek">{JSON.stringify(spec, null, 2)}</pre>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  onPublishCart(spec)
                  go({ name: 'game', id: spec.id })
                }}
              >
                Publish cart
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  void encodeCart(spec).then((payload) =>
                    navigator.clipboard.writeText(shareUrl(payload)),
                  )
                  flash('Share link copied')
                }}
              >
                Copy link
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
  )
}
