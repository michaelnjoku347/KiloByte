import { describe, expect, it } from 'vitest'
import type { GameRecord } from '../types'
import { forYou, mashupIdeas } from './recommend'

function game(id: string, genres: string[], rating = 4): GameRecord {
  return {
    id,
    title: id,
    author: 'House',
    blurb: id,
    description: id,
    genres,
    createdAt: '2026-01-01T00:00:00.000Z',
    cover: '#fff',
    palette: { bg: '#000', paper: '#fff', accent: '#fff' },
    bytes: 1,
    rating,
    source: { kind: 'html', entry: 'index.html', href: '/games/x/index.html' },
  }
}

describe('on-device recommendations', () => {
  it('ranks games that share a genre with something you played', () => {
    const games = [game('puzzle', ['Puzzle'], 5), game('sim', ['Simulator'], 3), game('other', ['Racing'], 5)]
    const picks = forYou(games, { sim: 2 }, [], 2)
    expect(picks[0].id).toBe('sim')
    expect(picks.map((g) => g.id)).not.toContain('other')
  })

  it('writes mashup pitches without calling a model', () => {
    const ideas = mashupIdeas('harbor night')
    expect(ideas).toHaveLength(3)
    expect(ideas[0].pitch).toMatch(/harbor night/)
    expect(ideas[0].title.length).toBeGreaterThan(3)
  })
})
