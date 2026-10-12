# Kilobyte

A browser game launcher. People pick a title, press Play, and the game runs in this tab. Creators publish by uploading a build or pointing at a public GitHub repo. The site itself is static: no server, no database, no paid AI proxy.

The house shelf opens on **Cinder Field**, a first-person WebGL2 range that runs in this tab, with the frame rate on screen. Behind it are plain HTML canvas games, one C++ game compiled to WebAssembly, and one-kilobyte carts. Everything else stays on GitHub or in the visitor’s browser. The same player launches a Unity, Godot, or custom export as long as the build has an `index.html`.

## Launch it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static files in dist/
```

`vite.config.ts` sets `base: './'`, so `dist/` works at a domain root, a GitHub project page, or a subfolder. The portfolio build passes `--base /kilobyte/` instead. See [Link it from njoku.dev](#link-it-from-njokudev).

## Architecture

```
public/games/manifest.json   titles, blurbs, folders, runtime
public/games/<dir>/          HTML entry, or Emscripten index.html + .js + .wasm
src/                           React launcher (hash router)
src/lib/engine.ts              tiny JSON "cart" games, drawn on a canvas
native/kiln-rally/             C++ / SDL2 source for the WebAssembly demo
scripts/build-wasm.sh          emcc → public/games/kiln-rally
```

The launcher is a Vite + React app. Routes are hashes (`#/game/house_kiln_rally`, `#/play/...`), so a static host does not need rewrites.

| Surface | What it does |
| --- | --- |
| Play | Featured game, mashup shelf, search, genre chips |
| Catalog | Ranked table, genre filter, HTML / WASM / cart filter |
| Game page | Blurb, mashup note, controls, rating |
| Player | WebGL stage in this tab; iframe for HTML, GitHub, uploads, and WASM; canvas for carts; fullscreen on the frame |
| Make | Upload a folder or zip, connect a GitHub repo, or mint a JSON cart |

A packaged game is just an `index.html`. HTML5 games are a single file. WebAssembly games are the Emscripten output (`index.html`, `index.js`, `index.wasm`) opened in the same iframe. Uploads go to IndexedDB and are served by `public/game-sw.js` under `local-game/`. Paths use Vite’s `BASE_URL`, so the service worker and the game files keep working when the site is mounted at `/kilobyte/`.

## Game manifest

`public/games/manifest.json` is the list of games that live in this repo. One object per game:

```json
{
  "v": 1,
  "games": [
    {
      "id": "house_example",
      "title": "Example",
      "author": "House",
      "blurb": "One sentence on the card.",
      "description": "A longer note for the detail page.",
      "mashup": "Optional. What two ideas were crossed, in your own words.",
      "genres": ["Mashup", "Arcade"],
      "runtime": "html",
      "dir": "example",
      "entry": "index.html",
      "cover": "#ff7a3c",
      "palette": { "bg": "#1c120c", "paper": "#f3ead7", "accent": "#ff7a3c" },
      "createdAt": "2026-10-12T00:00:00.000Z",
      "rating": 4.0,
      "bytes": 8000,
      "controls": "What to press."
    }
  ]
}
```

`runtime` is `"html"` or `"wasm"`. `id` is letters, numbers, and underscores. `dir` is the folder under `public/games/`. `entry` defaults to `index.html`.

The GitHub-hosted 2048 link stays in `src/data/catalog.ts` because Kilobyte does not store those files.

## Add a game

HTML or JavaScript:

1. Create `public/games/your-game/index.html`. Keep the art and code original.
2. Add an object to `public/games/manifest.json` with `"runtime": "html"`.
3. `npm run dev` and open the new card.

WebAssembly:

1. Put C or C++ under `native/your-game/` and teach `scripts/build-wasm.sh` to compile it into `public/games/your-game/`.
2. Add a manifest object with `"runtime": "wasm"`.
3. Run `npm run build:wasm`, then `npm run dev`.

You can also skip the manifest and use Make → Upload (zip or folder with an `index.html`) or Make → GitHub (`owner/repo`). Uploaded `.wasm` files are served as `application/wasm`. Those games stay on that browser or on GitHub; they are not committed here.

### Mashup demos in this repo

Original names, code, and shapes. They are not ports, and they do not use commercial titles or assets.

| Game | Runtime | Idea |
| --- | --- | --- |
| Kiln Rally | C++ → WASM (SDL2) | A brick-stacking workshop crossed with a bouncing puck sport |
| Plot Puck | HTML canvas | A garden planner crossed with a table puck |
| Lantern Reach | HTML canvas | A four-lane rhythm game crossed with a lantern-boat race |

### Other ways a game gets in

| Path | What you provide | Where the files live |
| --- | --- | --- |
| **Connect GitHub** | Title, kinds, `owner/repo`, play URL | GitHub / jsDelivr |
| **Upload zip or HTML** | Metadata + files in the creator’s IndexedDB | The creator’s browser |
| **WebGL stage** | The house range, in the page bundle | Nobody extra |
| **Prompt a JSON cart** | ~1 KB recipe | Nobody |

GitHub is the production path for a full web build: a WASM port, a Phaser project, a Unity or Godot export — anything with an `index.html`.

## Build a C++ game to WebAssembly

Kiln Rally is `native/kiln-rally/src/main.cpp`. Emscripten provides SDL2. The checked-in `public/games/kiln-rally/` files are the last build, so `npm run dev` works without a local SDK. Rebuild when you change the C++.

Install [Emscripten](https://emscripten.org/) 4.0.11 (the version CI uses):

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 4.0.11
./emsdk activate 4.0.11
source ./emsdk_env.sh
cd /path/to/KiloByte
npm run build:wasm
```

`scripts/build-wasm.sh` looks for `emcc` on `PATH`, then sources `emsdk_env.sh` from `/tmp/emsdk`, `~/emsdk`, or `./emsdk`. The command is:

```bash
emcc native/kiln-rally/src/main.cpp \
  -o public/games/kiln-rally/index.html \
  --shell-file native/kiln-rally/shell.html \
  -std=c++17 -O2 \
  -sUSE_SDL=2 -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1
```

The shell page is the iframe document. It must keep a `<canvas id="canvas">` and a `Module` object, and it must include the literal `{{{ SCRIPT }}}` so Emscripten can inject the loader.

## GitHub Actions and GitHub Pages

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:

1. Install Emscripten 4.0.11.
2. `npm ci`, lint, and test.
3. `npm run build:wasm`, then `npm run build`.
4. On a push to `main`, upload `dist/` and deploy with GitHub Pages.

Before the deploy job can succeed, turn on Pages for this repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site will be at:

`https://michaelnjoku347.github.io/KiloByte/`

Until that setting is on, the deploy job fails and the build job still proves the WASM and the site compile. Pull requests do not deploy.

## Link it from njoku.dev

The portfolio repo ([MichaelNjoku](https://github.com/michaelnjoku347/MichaelNjoku)) already mounts a built copy at [njoku.dev/kilobyte/](https://njoku.dev/kilobyte/). After this branch is on `main`, from that repo:

```bash
npm run kilobyte
```

That clones Kilobyte, runs `vite build --base /kilobyte/`, and writes `public/kilobyte/`. Commit that folder. The portfolio used to patch absolute `/games/` and `/game-sw.js` paths. It skips the patch when `src/lib/idb.ts` mentions `BASE_URL`, which it now does. Deep links use the hash:

- Library: `https://njoku.dev/kilobyte/`
- A game: `https://njoku.dev/kilobyte/#/game/house_kiln_rally`
- Play: `https://njoku.dev/kilobyte/#/play/house_kiln_rally`

An iframe on any other page:

```html
<iframe
  src="https://njoku.dev/kilobyte/#/play/house_plot_puck"
  title="Plot Puck on Kilobyte"
  style="width: 100%; height: 720px; border: 0; border-radius: 16px"
></iframe>
```

GitHub Pages is the other static host. Same hash routes, with the project-page origin above. Relative `base: './'` also lets you drop `dist/` into any folder and open `index.html`.

## What the cabinet does

- **Play**: a live WebGL lead you can launch, then the mashup shelf and the rest of the library
- **Catalog**: a table of every game, ranked by star rating and filterable by kind and runtime (HTML, WASM, cart)
- Find a title from the masthead; each card has Play, Save, and “what this is”
- **You**: optional on-device card (no account server) and Light/Dark appearance
- Player: WebGL stage, iframe for HTML, GitHub, uploads, and WASM, canvas for carts. Esc leaves play; Esc exits fullscreen first, and Esc releases the mouse before it leaves a pointer-locked session
- Make: Upload files/folder/zip · Inspect + publish a public repo · optional cart prompt
- House library across a first-person WebGL range, WebAssembly and HTML mashups, Simulator, Shooter, Puzzle, Horror, Rhythm, Strategy, Racing, Idle, and arcade carts
- Optional Gemini / GitHub tokens stay in `localStorage` on the visitor’s machine

## Scripts

```bash
npm run test
npm run lint
npm run build:wasm
npm run build
npm run smoke          # needs the dev server on :5173
```

## House rules

Write your own code and draw your own shapes. Do not drop in commercial sprites, names, or decompiled game code. 2048 is linked, not vendored; it is Gabriele Cirulli’s MIT-licensed project. Mashup blurbs describe the idea in original words.

A GitHub token, if a visitor types one under Make, stays in `localStorage` on that machine. Platform model calls do not use that field.

## What works with zero accounts

- The store, age tags, house games, Kiln Rally, and Cinder Field versus bots.
- Uploads stay in IndexedDB on that browser, with engine detection and a 40 MB cap.
- “For you” and the mashup desk are on-device. They are not labeled as a model.
- After one online visit, the production service worker caches the shell so the match can open offline. `localhost` is not cached, so Vite keeps working.

## Creator uploads

Drop a zip or folder that contains `index.html`. Kilobyte rejects `..` paths and installer types (`.exe`, `.dll`, `.sh`, `.php`, and similar). It names the engine from the files:

| Export | What it looks for |
| --- | --- |
| Unity WebGL | `createUnityInstance`, `unity-canvas`, or a `.unityweb` file |
| Godot HTML5 | `Godot` in the scripts, or a `.pck` |
| Emscripten C/C++ | `emscripten`, or a `.wasm` that is not one of the engines below |
| Rust wasm-bindgen | `wasm_bindgen` |
| Go wasm | `wasm_exec.js` |
| Bevy | `bevy_render` or `bevy_ecs` |
| Plain JS | an HTML entry and none of the above |

Builds over 40 MB should be a public GitHub repo (Make → Connect GitHub). That path does not copy the files onto Kilobyte.

Godot threads need cross-origin isolation headers. GitHub Pages does not send them. Export with threads off, or host the build where you can set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

## Cinder Field

The lead game is an original WebGL2 match on the yard that already shipped: cover, a carbine, a shotgun, three rivals, ember pickups that heal, procedural sound, a match clock, and a local top-score list. First to 8, or the clock. It is tagged 16+. Versus bots does not need an account. Online play is the lobby panel, and it stays honest when Supabase is not configured.

## Accounts and keys Michael has to create

Nothing is required to play or to publish on one browser. These are the free-tier pieces, and the app does not pretend they are on.

1. **Supabase** (free project). In the project settings, copy the project URL and the **anon** key into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild. The anon key is public. Do not put the service role key in Vite.
2. In the Supabase SQL editor, run `supabase/migrations/20261012_init.sql`. That creates profiles, games, ratings, plays, favorites, scores, lobbies, and client error rows, with row level security.
3. Create a storage bucket named `games`. The migration’s storage policies let a signed-in user write only inside their own folder, and let anyone read.
4. Install the Supabase CLI, then deploy `supabase/functions/studio`. Set the function secret `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/) (free tier). That key never ships in the browser bundle. CI fails the build if `service_role` or `GEMINI_API_KEY` shows up in `dist/`.
5. **GitHub Pages** for this repo: Settings → Pages → Source: GitHub Actions. Already described above.
6. Email confirmation is controlled by the Supabase project. If it is on, the You page says to open the mail before a session exists.

When those are set, the You page can create a cloud account, an upload is copied into the bucket, and Cinder Field can host a lobby. Signaling uses Supabase Realtime (included on the free plan). The match itself is WebRTC through `stun:stun.l.google.com:19302`, so the game packets are not stored. If the free quotas are hit, local play and local uploads keep working.

Studio actions are `describe`, `ideas`, `search`, `recommend`, and `cover`. Cover art is requested from Gemini’s image model. If the model returns no image, the function says so and the card keeps its original cover. There is no paid image API in this repo.

## Performance

The WebGL match is its own chunk. `npm run build` writes gzip and brotli siblings for large static files. GitHub Pages compresses responses itself and ignores those siblings; a host that serves `.br` (Cloudflare Pages) can use them. Hashed files under `assets/` are safe to cache for a year. The service worker does not cache the Vite dev server.
