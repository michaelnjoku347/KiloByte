# Kilobyte

A cabinet for browser games. People **pick a title**, **launch it in the tab**, and **publish** a WebGL or HTML build by uploading files or connecting a GitHub repo. You do not store the binaries.

The house shelf opens on **Cinder Field**, a first-person WebGL2 range that runs on the visitor’s GPU, with the frame rate on screen. Smaller HTML titles and one-kilobyte carts sit behind it. The same player launches a Unity, Godot, or custom export as long as the build has an `index.html`.

## Launch it

This is a static site. No server, no database, no paid AI proxy.

```bash
npm install
npm run dev      # local
npm run build    # then host dist/ on GitHub Pages or Cloudflare Pages
```

Visitors play for free. Creators publish for free. Your bill stays at hosting a frontend.

## How a game gets into the cabinet

| Method | What you store | Who pays for the files |
| --- | --- | --- |
| **Connect GitHub** | Title, kinds, `owner/repo`, play URL | GitHub / jsDelivr |
| **Upload zip or HTML** | Metadata + files in the creator’s IndexedDB | The creator’s browser |
| **WebGL stage** | The house range, in the page bundle | Nobody extra |
| **Prompt a JSON cart** | ~1 KB recipe | Nobody |

GitHub is the production path for a full web build: a WASM port, a Phaser project, a Unity or Godot export — anything with an `index.html`.

## Product

- **Play**: a live WebGL lead you can launch, then the rest of the shelf
- **Catalog**: a table of every game, ranked by star rating and filterable by kind
- Find a title from the masthead; each card has Play, Save, and “what this is”
- **You**: optional on-device card (no account server) and Light/Dark appearance
- Player: WebGL stage, iframe for HTML/GitHub, built-in engine for carts. Esc leaves play
- Make: Upload files/folder/zip · Inspect + publish a public repo · optional cart prompt
- House library across a first-person WebGL range, Simulator, Shooter, Puzzle, Horror, Rhythm, Strategy, Racing, Idle, and arcade carts
- Optional Gemini / GitHub tokens stay in `localStorage` on the visitor’s machine

## Scripts

```bash
npm run test
npm run lint
npm run build
npm run smoke
```
