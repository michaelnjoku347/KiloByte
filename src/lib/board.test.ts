import { describe, expect, it } from 'vitest'
import { readScores, rememberScore } from './board'

describe('local leaderboard', () => {
  it('keeps the highest scores', () => {
    const once = rememberScore('You', 4, null, 1)
    const twice = rememberScore('You', 8, JSON.stringify(once), 2)
    expect(twice[0].score).toBe(8)
    expect(readScores('nope')).toEqual([])
  })
})
