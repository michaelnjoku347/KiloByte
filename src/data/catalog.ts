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
    blurb: 'First person on the yard. Carbine, shotgun, three rivals. First to eight.',
    description:
      'An original WebGL2 match in this tab. The yard is the map: cover, embers that heal, and three rivals who patrol until they see you. Click to look, move with WASD, sprint with Shift, fire with the mouse or Space, switch weapons with 1 and 2, reload with R. Fullscreen fills the cabinet. Esc releases the mouse, then leaves. Versus bots works offline. A second player needs the free Supabase lobby, and the page says so when that project is not configured.',
    genres: ['Arcade', 'Shooter'],
    createdAt: '2026-03-20T00:00:00.000Z',
    cover: '#e8a04a',
    art: 'covers/cinder-field-cover.jpg',
    age: '16',
    controls: 'Click to look. WASD moves. Shift sprints. Mouse or Space fires. 1 carbine, 2 shotgun, R reloads.',
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
    age: 'all',
    createdAt: '2014-03-01T00:00:00.000Z',
    cover: '#edc22e',
    art: 'covers/puzzle-tiles-cover.jpg',
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
