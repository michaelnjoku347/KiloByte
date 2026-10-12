import { describe, expect, it } from 'vitest'
import { gamesFromManifest, manifestGames, parseEntry } from './manifest'
import { publicUrl } from './base'

describe('game manifest', () => {
  it('loads the house shelf, including wasm and mashup demos', () => {
    const games = manifestGames()
    const ids = games.map((g) => g.id)
    expect(ids).toContain('house_dock_ledger')
    expect(ids).toContain('house_kiln_rally')
    expect(ids).toContain('house_plot_puck')
    expect(ids).toContain('house_lantern_reach')
    const kiln = games.find((g) => g.id === 'house_kiln_rally')
    expect(kiln?.source.kind).toBe('wasm')
    expect(kiln?.genres).toContain('Mashup')
    expect(kiln?.mashup).toMatch(/puck/i)
    expect(kiln?.source.kind === 'wasm' ? kiln.source.href : '').toMatch(/games\/kiln-rally\/index\.html$/)
    expect(kiln?.art).toBe('covers/kiln-rally-cover.jpg')
    expect(games.filter((g) => g.genres.includes('Mashup'))).toHaveLength(3)
    expect(games.find((g) => g.id === 'house_night_clerk')?.age).toBe('13')
    expect(games.find((g) => g.id === 'house_dock_ledger')?.age).toBe('all')
  })

  it('skips a broken entry and keeps the valid one', () => {
    const games = gamesFromManifest({
      v: 1,
      games: [
        { id: 'nope' },
        {
          id: 'house_ok',
          title: 'Ok',
          author: 'House',
          blurb: 'Short.',
          description: 'Longer.',
          genres: ['Arcade'],
          createdAt: '2026-01-01T00:00:00.000Z',
          cover: '#fff',
          palette: { bg: '#000', paper: '#fff', accent: '#f00' },
          runtime: 'html',
          dir: 'ok-game',
        },
      ],
    })
    expect(games.map((g) => g.id)).toEqual(['house_ok'])
    expect(parseEntry(null)).toBeUndefined()
    expect(parseEntry({ ...games[0], id: 'has space' })).toBeUndefined()
  })

  it('prefixes public paths with the site base', () => {
    expect(publicUrl('/games/kiln-rally/index.html')).toMatch(/games\/kiln-rally\/index\.html$/)
    expect(publicUrl('game-sw.js')).toMatch(/game-sw\.js$/)
  })
})
