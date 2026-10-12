import type { GameRecord } from '../types'

/**
 * Packaged HTML and WASM games live in `public/games/manifest.json`.
 * This list is only for titles Kilobyte points at but does not host.
 */
export const HOUSE_GAMES: GameRecord[] = [
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
