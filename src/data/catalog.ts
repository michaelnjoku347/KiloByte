import type { GameRecord } from '../types'

/**
 * Packaged HTML and WASM games live in `public/games/manifest.json`.
 * This list is the in-tab WebGL range plus titles Kilobyte points at but does not host.
 */
export const HOUSE_GAMES: GameRecord[] = [
  {
    id: 'house_cinder_field',
    title: 'Cinder Field',
    author: 'House',
    blurb: 'First person, on your GPU. Walk the yard. The corner counter is the frame rate.',
    description:
      'A WebGL2 session in this tab — the same kind of browser play as a high-frame-rate port, built as an original range. Click the view, look with the mouse, move with WASD, and pick up every ember. Fullscreen fills the cabinet. Esc releases the mouse, then leaves. Kilobyte does not ship someone else’s game; it launches web builds, and this one lives in the page.',
    genres: ['Arcade', 'Shooter'],
    createdAt: '2026-03-20T00:00:00.000Z',
    cover: '#e8a04a',
    palette: { bg: '#12141c', paper: '#f4efe6', accent: '#e8a04a' },
    house: true,
    bytes: 0,
    rating: 5,
    source: { kind: 'stage', stage: 'cinder-field' },
  },
  {
    id: 'house_2048',
    title: '2048',
    author: 'Gabriele Cirulli',
    blurb: 'Slide tiles. Join the numbers. Public GitHub repo, played here.',
    description:
      'The original MIT-licensed 2048. Kilobyte does not host the files — it points at the public repo through jsDelivr, which is the same path you get when you connect your own GitHub game.',
    genres: ['Puzzle', 'Casual'],
    createdAt: '2014-03-01T00:00:00.000Z',
    cover: '#edc22e',
    palette: { bg: '#faf8ef', paper: '#776e65', accent: '#edc22e' },
    house: true,
    bytes: 0,
    rating: 4.8,
    source: {
      kind: 'github',
      owner: 'gabrielecirulli',
      repo: '2048',
      branch: 'master',
      path: '',
      playUrl: 'https://gabrielecirulli.github.io/2048/',
      htmlUrl: 'https://github.com/gabrielecirulli/2048',
    },
  },
]
