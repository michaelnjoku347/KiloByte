# Kilobyte

A catalog of browser games: people **pick a title**, **press Play**, and **publish** by uploading a build or connecting a GitHub repo. You do not store Unity/WebGL binaries.

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
| **Mint a JSON cart** | ~1 KB recipe | Nobody |

GitHub is the production path for “literally any game”: a Phaser project, a puzzle, a sim, a shooter — as long as it is a web build with an `index.html`.

## Product

- **Play**: featured game, star ratings, wrapping grid of covers
- **Catalog**: a table of every game, ranked by star rating and filterable by kind
- Find a title from the masthead; each card has Play, Save, and “what this is”
- **You**: optional on-device card (no account server) and Light/Dark appearance
- Player: iframe for HTML/GitHub, built-in engine for carts
- Make: Upload files/folder/zip · Inspect + publish a public repo · optional cart mint
- House library across Simulator, Shooter, Puzzle, Horror, Rhythm, Strategy, Racing, Idle, and arcade carts
- Optional Gemini / GitHub tokens stay in `localStorage` on the visitor’s machine

## Scripts

```bash
npm run test
npm run lint
npm run build
npm run smoke
```
