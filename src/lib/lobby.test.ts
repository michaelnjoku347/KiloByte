import { describe, expect, it } from 'vitest'
import { applySignal, hostLobby, joinLobby, lobbyCode } from './lobby'

describe('lobby signaling', () => {
  it('walks a host and a guest to a connected peer', () => {
    const host = hostLobby('K7NQ')
    expect(host.phase).toBe('waiting')
    const greeted = applySignal(host, { type: 'hello', role: 'guest' })
    expect(greeted.phase).toBe('signaling')
    const answered = applySignal(greeted, { type: 'answer', sdp: 'answer' })
    const up = applySignal(answered, { type: 'ice', candidate: 'c' })
    expect(up.phase).toBe('connected')

    const guest = joinLobby('K7NQ')
    const offered = applySignal(guest, { type: 'offer', sdp: 'offer' })
    expect(applySignal(offered, { type: 'ice', candidate: 'c' }).phase).toBe('connected')
    expect(applySignal(up, { type: 'bye' }).phase).toBe('closed')
  })

  it('builds a short code', () => {
    expect(lobbyCode()).toHaveLength(4)
  })
})
