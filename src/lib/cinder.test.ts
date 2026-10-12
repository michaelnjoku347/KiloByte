import { describe, expect, it } from 'vitest'
import { blocked, createYard, playerStart, SHARD_COUNT, stepPlayer } from './cinder'

describe('cinder field', () => {
  it('builds a walkable yard with eight embers', () => {
    const yard = createYard()
    const start = playerStart()
    expect(yard.shards).toHaveLength(SHARD_COUNT)
    expect(yard.positions.length).toBeGreaterThan(1000)
    expect(blocked(start.x, start.z, 0.45, yard.solids)).toBe(false)
    expect(yard.solids.some((box) => box.maxX === 1.4 && box.minZ === -9.2)).toBe(true)
  })

  it('walks forward and stops at a wall', () => {
    const yard = createYard()
    const open = stepPlayer(playerStart(), yard, { forward: 1, strafe: 0, lookX: 0, lookY: 0 }, 0.5, [])
    expect(open.player.z).toBeLessThan(playerStart().z)

    const z0 = -6.2 + 0.5
    const blockedStep = stepPlayer(
      { x: 0, y: 1.62, z: z0, yaw: Math.PI, pitch: 0 },
      yard,
      { forward: 1, strafe: 0, lookX: 0, lookY: 0 },
      0.5,
      [],
    )
    expect(blockedStep.player.z).toBeCloseTo(z0)
  })

  it('picks up an ember you walk into', () => {
    const yard = createYard()
    const shard = yard.shards[0]
    const stepped = stepPlayer(
      { x: shard.x, y: 1.62, z: shard.z, yaw: 0, pitch: 0 },
      yard,
      { forward: 0, strafe: 0, lookX: 0.2, lookY: 0 },
      0.016,
      yard.shards.map(() => false),
    )
    expect(stepped.collected[0]).toBe(true)
    expect(stepped.player.yaw).toBeCloseTo(-0.2)
  })
})
