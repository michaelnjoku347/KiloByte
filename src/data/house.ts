import type { GameSpec } from '../types'
import { compileCart } from '../lib/generate'

function house(
  id: string,
  prompt: string,
  title: string,
  blurb: string,
  seed: number,
): GameSpec {
  return compileCart({
    id,
    prompt,
    title,
    blurb,
    seed,
    author: 'House',
    house: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  })
}

export const HOUSE_CARTS: GameSpec[] = [
  house(
    'house_star_nibbler',
    'space collector with angry comets and gold orbs',
    'Star Nibbler',
    'Scoop orbit candy. Do not hug the comets.',
    110029,
  ),
  house(
    'house_brick_lantern',
    'dungeon breakout brick paddle lantern crypt',
    'Brick Lantern',
    'A keep made of bricks. Break the night shift.',
    441120,
  ),
  house(
    'house_moss_run',
    'forest platformer jump moss coins owls',
    'Moss Run',
    'Leap the grove. Pocket every acorn.',
    882211,
  ),
  house(
    'house_neon_rain',
    'neon dodge rain falling glitch hail',
    'Neon Rain',
    'The cabinet is leaking pixels. Stay dry.',
    193847,
  ),
  house(
    'house_coil',
    'candy snake coil gumdrop factory',
    'Coil',
    'Grow sweet. Do not bite your own sugar.',
    550021,
  ),
  house(
    'house_last_buoy',
    'ocean survive horde tide sharks waves',
    'Last Buoy',
    'Forty seconds of bad weather. Hold the lantern.',
    670134,
  ),
]

export const HOUSE_CART_RATINGS: Record<string, number> = {
  house_star_nibbler: 4.2,
  house_brick_lantern: 4.1,
  house_moss_run: 3.9,
  house_neon_rain: 3.7,
  house_coil: 3.6,
  house_last_buoy: 3.5,
}
