# Kilobyte Arcade

A free arcade where people mint **AI browser games as tiny JSON carts**, publish them, and play anyone else’s game in the browser — without you paying for game file storage.

## The storage answer

Do not store games as Unity/Unreal builds, videos, or screenshots. Store a **recipe**.

| What you would store | Typical size | Who pays |
| --- | --- | --- |
| WebGL game build | 20–80 MB | You, forever |
| Kilobyte cart (`GameSpec` JSON) | ~1–2 KB | Effectively nobody |

This site is a static Vite app. One shared canvas engine plays every cart. That is the whole trick:

1. **House arcade** ships inside the frontend. Host on GitHub Pages or Cloudflare Pages — $0.
2. **Player carts** live in `localStorage` (`kilobyte.arcade.v1`) on their machine — $0 on you.
3. **Sharing** gzip-encodes the cart into the URL hash (`#/c/...`) so a game can travel without a database — $0 on you.
4. **Generation** runs on-device. Optional Gemini uses the player’s own key, never yours.

A thousand published carts is still smaller than one compressed screenshot. If you someday want a global search index, keep storing recipes: dump JSON into a Git repo or Cloudflare R2. A million 2 KB carts is about 2 GB.

## Run

```bash
npm install
npm run dev
```

Open the Arcade, Studio (mint a cart from a prompt), or **Why it’s free**.

## Scripts

```bash
npm run build   # typecheck + production build
npm run test
npm run lint
npm run smoke   # optional headed browser smoke (needs Chromium via puppeteer)
```

## What this is (and is not)

- Playable mini-games: collector, shooter, dodge, snake, breakout, platformer, survive
- Prompt → compact cart, with optional Gemini
- **Not** a 3D game engine, not a paid AI proxy, not a cloud save platform
