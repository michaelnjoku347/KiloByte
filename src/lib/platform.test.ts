import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseGithubInput, jsdelivrUrl } from './github'
import { filesFromZip, findEntry } from './bundle'
import { normalizeGenre, parseGenreList, toggleGenre } from './genres'
import { buildRails, featuredGame, filterGames, formatCount } from './catalog'
import { parseHash, toHash } from './route'
import { emptyState, houseLibrary, upsertGame } from './storage'
import { recordFromCart } from './record'
import { compileCart } from './generate'
import { checkPassphrase, makeProfile, normalizeHandle, parseHandle } from './profile'
import { parseTheme } from './theme'
import type { GameRecord } from '../types'

function fakeGame(partial: Partial<GameRecord> & Pick<GameRecord, 'id' | 'title' | 'genres'>): GameRecord {
  return {
    author: 'A',
    blurb: '',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    cover: '#fff',
    palette: { bg: '#000', paper: '#fff', accent: '#f00' },
    bytes: 10,
    source: { kind: 'html', entry: 'index.html', href: '/x.html' },
    ...partial,
  }
}

describe('github refs', () => {
  it('parses owner/repo and tree URLs', () => {
    expect(parseGithubInput('gabrielecirulli/2048')).toEqual({
      owner: 'gabrielecirulli',
      repo: '2048',
      path: '',
    })
    expect(parseGithubInput('https://github.com/acme/game/tree/main/dist')).toEqual({
      owner: 'acme',
      repo: 'game',
      branch: 'main',
      path: 'dist',
    })
    expect(
      jsdelivrUrl({ owner: 'acme', repo: 'game', branch: 'main', path: 'dist' }),
    ).toBe('https://cdn.jsdelivr.net/gh/acme/game@main/dist/index.html')
  })
})

describe('genres', () => {
  it('normalizes and toggles any genre', () => {
    expect(normalizeGenre('simulator')).toBe('Simulator')
    expect(parseGenreList('puzzle, visual novel | farming')).toEqual([
      'Puzzle',
      'Visual Novel',
      'Farming',
    ])
    expect(toggleGenre(['Puzzle'], 'Puzzle')).toEqual([])
    expect(toggleGenre([], 'Roguelike')).toEqual(['Roguelike'])
  })
})

describe('browse filter', () => {
  it('searches and requires every selected genre', () => {
    const games = [
      fakeGame({ id: 'a', title: 'Harbor', genres: ['Simulator', 'Tycoon'], description: 'boats' }),
      fakeGame({ id: 'b', title: 'Ash', genres: ['Puzzle'], description: 'tiles' }),
    ]
    const mine = new Set<string>()
    const sim = filterGames(games, { query: 'boat', genres: ['Simulator'], source: 'all', sort: 'title' }, mine, {})
    expect(sim.map((g) => g.id)).toEqual(['a'])
    const both = filterGames(
      games,
      { query: '', genres: ['Simulator', 'Puzzle'], source: 'all', sort: 'title' },
      mine,
      {},
    )
    expect(both).toEqual([])
  })
})

describe('upload zip', () => {
  it('finds index.html after stripping a root folder', async () => {
    const zipped = zipSync({
      'MyGame/index.html': strToU8('<!doctype html><title>G</title>'),
      'MyGame/app.js': strToU8('console.log(1)'),
    })
    const copy = new ArrayBuffer(zipped.byteLength)
    new Uint8Array(copy).set(zipped)
    const files = await filesFromZip(copy)
    expect(files.map((f) => f.path).sort()).toEqual(['app.js', 'index.html'])
    expect(findEntry(files.map((f) => f.path))).toBe('index.html')
  })
})

describe('routes', () => {
  it('parses dashboards, create tabs, and play', () => {
    expect(parseHash('#/studio')).toEqual({ name: 'create', tab: 'generate' })
    expect(parseHash('#/create/github')).toEqual({ name: 'create', tab: 'github' })
    expect(parseHash('#/game/house_dock_ledger')).toEqual({ name: 'game', id: 'house_dock_ledger' })
    expect(toHash({ name: 'create', tab: 'upload' })).toBe('#/create/upload')
  })

  it('parses catalog, search, and you hashes', () => {
    expect(parseHash('#/charts/Simulator')).toEqual({ name: 'charts', genre: 'Simulator' })
    expect(parseHash('#/search/dock')).toEqual({ name: 'search', query: 'dock' })
    expect(parseHash('#/you')).toEqual({ name: 'you' })
    expect(parseHash('#/profile')).toEqual({ name: 'you' })
    expect(toHash({ name: 'charts', genre: 'Puzzle' })).toBe('#/charts/Puzzle')
    expect(toHash({ name: 'search', query: 'dock ledger' })).toBe('#/search/dock%20ledger')
    expect(toHash({ name: 'you' })).toBe('#/you')
  })
})

describe('catalog shelves', () => {
  it('formats play counts and builds You were here / Worth a look / kind shelves', () => {
    expect(formatCount(22100)).toBe('22K')
    expect(formatCount(980)).toBe('980')
    const games = [
      fakeGame({
        id: 'a',
        title: 'Harbor',
        genres: ['Simulator'],
        visits: 50,
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      fakeGame({
        id: 'b',
        title: 'Ash',
        genres: ['Puzzle'],
        visits: 10,
        createdAt: '2026-01-03T00:00:00.000Z',
      }),
    ]
    expect(featuredGame(games, { b: 100 })?.id).toBe('b')
    const rails = buildRails(games, {}, ['b'], new Set(['a']), ['a'])
    expect(rails.map((r) => r.id)).toEqual([
      'continue',
      'favorites',
      'recommended',
      'upcoming',
      'yours',
      'genre-Simulator',
      'genre-Puzzle',
    ])
    expect(rails[0].games[0].id).toBe('b')
    expect(rails.find((r) => r.id === 'favorites')?.games[0].id).toBe('a')
  })
})

describe('cabinet storage', () => {
  it('ships a mixed house library and upserts player games', () => {
    const lib = houseLibrary()
    expect(lib.length).toBeGreaterThanOrEqual(14)
    expect(lib.some((g) => g.genres.includes('Simulator'))).toBe(true)
    expect(lib.some((g) => g.genres.includes('Shooter'))).toBe(true)
    expect(lib.some((g) => g.genres.includes('Puzzle'))).toBe(true)
    expect(lib.some((g) => g.source.kind === 'github')).toBe(true)
    const spec = compileCart({
      prompt: 'ocean collector',
      author: 'A',
      id: 'cart_a',
      seed: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const rec = recordFromCart(spec)
    const once = upsertGame(emptyState().games, rec)
    const twice = upsertGame(once, { ...rec, title: 'Tide Pocket' })
    expect(twice).toHaveLength(1)
    expect(twice[0].title).toBe('Tide Pocket')
    expect(twice[0].house).toBe(false)
  })
})

describe('profile cards', () => {
  it('normalizes handles and seals an optional passphrase', async () => {
    expect(normalizeHandle(' Mina Oak ')).toBe('minaoak')
    expect(parseHandle('mina_ok')).toBe('mina_ok')
    expect(() => parseHandle('ab')).toThrow(/3 letters/)
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('nope')).toBe('light')
    const card = await makeProfile({
      displayName: 'Mina Oak',
      handle: 'Mina_Oak',
      bio: 'harbor nights',
      passphrase: 'secret1',
    })
    expect(card.handle).toBe('mina_oak')
    expect(card.displayName).toBe('Mina Oak')
    expect(card.hash).toBeTruthy()
    expect(await checkPassphrase('secret1', card.salt ?? '', card.hash ?? '')).toBe(true)
    expect(await checkPassphrase('wrongone', card.salt ?? '', card.hash ?? '')).toBe(false)
  })
})
