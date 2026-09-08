import { describe, expect, it } from 'vitest'
import { compileCart, detectGenre, detectTheme, remixCart } from './generate'
import { cartBytes, decodeCart, encodeCart, formatBytes, isGameSpec } from './cart'
import { HOUSE_CARTS } from '../data/house'
import { parseHash, toHash } from './route'
import { arcadeWeight, emptyState, upsertCart } from './storage'

describe('prompt compiler', () => {
  it('maps obvious genres and themes', () => {
    expect(detectGenre('cyber snake coil')).toBe('snake')
    expect(detectGenre('breakout brick paddle')).toBe('breakout')
    expect(detectGenre('forest platformer jump')).toBe('platformer')
    expect(detectGenre('space invader blaster')).toBe('shooter')
    expect(detectGenre('dodge the meteor rain')).toBe('dodge')
    expect(detectGenre('zombie horde survive')).toBe('survive')
    expect(detectGenre('collect candy orbs')).toBe('collector')
    expect(detectTheme('under the ocean tide')).toBe('ocean')
    expect(detectTheme('neon synth alley')).toBe('neon')
  })

  it('mints a valid compact cart from a prompt', () => {
    const spec = compileCart({
      prompt: 'a neon snake in a candy factory',
      author: 'Mina',
      id: 'cart_test1',
      seed: 42,
      createdAt: '2026-09-08T00:00:00.000Z',
    })
    expect(isGameSpec(spec)).toBe(true)
    expect(spec.genre).toBe('snake')
    expect(spec.theme).toBe('candy')
    expect(spec.author).toBe('Mina')
    expect(cartBytes(spec)).toBeLessThan(2048)
  })

  it('uses a quoted title when present', () => {
    const spec = compileCart({
      prompt: 'play "Moon Chew" a space collector',
      author: 'A',
      seed: 9,
      createdAt: '2026-09-08T00:00:00.000Z',
    })
    expect(spec.title).toBe('Moon Chew')
  })

  it('remixes without keeping the house flag', () => {
    const spec = remixCart(HOUSE_CARTS[0], 'Sam')
    expect(spec.id).not.toBe(HOUSE_CARTS[0].id)
    expect(spec.house).toBeUndefined()
    expect(spec.author).toBe('Sam')
    expect(spec.prompt).toBe(HOUSE_CARTS[0].prompt)
  })
})

describe('cart codec', () => {
  it('formats byte sizes in B, KB, and MB', () => {
    expect(formatBytes(800)).toBe('800 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(40 * 1024 * 1024)).toBe('40 MB')
  })

  it('roundtrips through gzip share payload', async () => {
    const spec = compileCart({
      prompt: 'dungeon breakout lantern',
      author: 'House',
      seed: 7,
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'cart_round',
    })
    const payload = await encodeCart(spec)
    expect(payload.startsWith('z.')).toBe(true)
    const back = await decodeCart(payload)
    expect(back).toEqual(spec)
  })
})

describe('house arcade', () => {
  it('ships six playable recipes under 2 KB each', () => {
    expect(HOUSE_CARTS).toHaveLength(6)
    for (const cart of HOUSE_CARTS) {
      expect(isGameSpec(cart)).toBe(true)
      expect(cart.house).toBe(true)
      expect(cartBytes(cart)).toBeLessThan(2048)
    }
    expect(arcadeWeight(HOUSE_CARTS)).toBeLessThan(12_000)
  })
})

describe('routes', () => {
  it('parses hash routes', () => {
    expect(parseHash('')).toEqual({ name: 'arcade' })
    expect(parseHash('#/studio')).toEqual({ name: 'studio' })
    expect(parseHash('#/why')).toEqual({ name: 'why' })
    expect(parseHash('#/play/house_coil')).toEqual({ name: 'play', id: 'house_coil' })
    expect(parseHash('#/c/z.abc/def')).toEqual({ name: 'share', payload: 'z.abc/def' })
    expect(toHash({ name: 'play', id: 'x' })).toBe('#/play/x')
  })
})

describe('cabinet storage', () => {
  it('upserts player carts without duplicating ids', () => {
    const a = compileCart({
      prompt: 'ocean collector',
      author: 'A',
      id: 'cart_a',
      seed: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const edited = { ...a, title: 'Tide Pocket' }
    const once = upsertCart(emptyState().carts, a)
    const twice = upsertCart(once, edited)
    expect(twice).toHaveLength(1)
    expect(twice[0].title).toBe('Tide Pocket')
    expect(twice[0].house).toBe(false)
  })
})
