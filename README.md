# Kilobyte Arcade

A launchable public arcade shaped like a Discover lobby: people **scroll experience rails**, **open Charts**, **search any genre**, **play in the browser**, and **publish** by uploading a build or connecting a GitHub repo. You do not store Unity/WebGL binaries.

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
| **Connect GitHub** | Title, genres, `owner/repo`, play URL | GitHub / jsDelivr |
| **Upload zip or HTML** | Metadata + files in the creator’s IndexedDB | The creator’s browser |
| **Mint a JSON cart** | ~1 KB recipe | Nobody |

GitHub is the production path for “literally any game”: a Phaser project, a puzzle, a sim, a shooter — as long as it is a web build with an `index.html`.

## Product

- **Discover**: featured experience, category chips, Continue / Recommended / genre rails
- **Charts**: visit-ranked lists, filterable by genre
- Search in the top bar; per-experience page with a large Play button, About, and Recommended
- Player: iframe for HTML/GitHub, built-in engine for carts
- Create: Upload files/folder/zip · Inspect + publish a public repo · optional cart mint
- House library across Simulator, Shooter, Puzzle, Horror, Rhythm, Strategy, Racing, Idle, and arcade carts
- Optional Gemini / GitHub tokens stay in `localStorage` on the visitor’s machine

## Scripts

```bash
npm run test
npm run lint
npm run build
npm run smoke
```
