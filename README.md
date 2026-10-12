# Kilobyte

A browser game launcher. People pick a title, press Play, and the game runs in this tab. Creators publish by uploading a build or pointing at a public GitHub repo. The site itself is static: no server, no database, no paid AI proxy.

House games ship with the site. That includes plain HTML canvas games and one C++ game compiled to WebAssembly. Everything else stays on GitHub or in the visitor’s browser.

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
| Player | iframe for HTML, GitHub, uploads, and WASM; canvas for carts; fullscreen on the frame |
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

Optional Gemini and GitHub tokens, if a visitor types them under Make, stay in `localStorage` on that machine.
