import { describe, expect, it } from 'vitest'
import { createYard } from './cinder'
import {
  createMatch,
  emptyInput,
  MATCH_KILLS,
  rayDistance,
  segmentHitsSolid,
  stepMatch,
  type MatchState,
} from './match'

const still = () => 0.5

function withRival(state: MatchState, x: number, z: number, hp = 100): MatchState {
  const rival = { ...state.fighters[1], x, z, hp, respawn: 0, score: 0 }
  return { ...state, fighters: [state.fighters[0], rival] }
}

describe('cinder field match', () => {
  it('hits a rival standing in front of the carbine', () => {
    const state = withRival(createMatch(), 0, 3)
    const next = stepMatch(state, [], { ...emptyInput(), fire: true }, 0.016, still)
    expect(next.fighters[1].hp).toBeLessThan(100)
    expect(next.events).toContain('shot')
    expect(next.events).toContain('hit')
  })

  it('does not shoot through a wall', () => {
    const state = withRival(createMatch(), 0, 2)
    const wall = [{ minX: -2, maxX: 2, minZ: 4, maxZ: 6 }]
    expect(segmentHitsSolid(wall, 0, 8, 0, 2)).toBe(true)
    const next = stepMatch(state, wall, { ...emptyInput(), fire: true }, 0.016, still)
    expect(next.fighters[1].hp).toBe(100)
    expect(next.events).not.toContain('hit')
  })

  it('reloads an empty carbine from the reserve', () => {
    const state = createMatch()
    state.fighters[0].mags.carbine = 0
    const started = stepMatch(state, [], { ...emptyInput(), reload: true }, 0.05, still)
    expect(started.fighters[0].reloading).toBeGreaterThan(0)
    expect(started.events).toContain('reload')
    let done = { ...started, fighters: [started.fighters[0]] }
    for (let i = 0; i < 30; i++) done = stepMatch(done, [], emptyInput(), 0.05, still)
    expect(done.fighters[0].mags.carbine).toBe(30)
    expect(done.fighters[0].reserves.carbine).toBe(60)
  })

  it('ends the match at the kill target', () => {
    const state = withRival(createMatch(), 0, 3, 10)
    state.fighters[0].score = MATCH_KILLS - 1
    const next = stepMatch(state, [], { ...emptyInput(), fire: true }, 0.016, still)
    expect(next.fighters[0].score).toBe(MATCH_KILLS)
    expect(next.over).toBe(true)
    expect(next.winner).toBe('You')
  })

  it('keeps the opening spawns out of the yard walls', () => {
    const yard = createYard()
    const match = createMatch()
    for (const body of match.fighters) {
      expect(segmentHitsSolid(yard.solids, body.x, body.z, body.x, body.z)).toBe(false)
    }
    expect(rayDistance(0, 8, 0, -1, 0, 3, 0.6)).not.toBeNull()
  })
})
