export type Signal =
  | { type: 'hello'; role: 'host' | 'guest' }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: string }
  | { type: 'bye' }

export type LobbyPhase = 'idle' | 'waiting' | 'signaling' | 'connected' | 'closed'

export type LobbyView = {
  phase: LobbyPhase
  role: 'host' | 'guest' | null
  code: string
  note: string
}

export function freshLobby(): LobbyView {
  return { phase: 'idle', role: null, code: '', note: '' }
}

export function hostLobby(code: string): LobbyView {
  return { phase: 'waiting', role: 'host', code, note: 'Waiting for a guest. The match is still versus bots until they connect.' }
}

export function joinLobby(code: string): LobbyView {
  return { phase: 'signaling', role: 'guest', code, note: 'Sending a greeting.' }
}

export function applySignal(view: LobbyView, message: Signal): LobbyView {
  if (message.type === 'bye') return { ...view, phase: 'closed', note: 'The other player left. Bots stay in the match.' }
  if (view.phase === 'closed' || view.phase === 'idle') return view
  if (message.type === 'hello' && view.role === 'host') {
    return { ...view, phase: 'signaling', note: 'Guest joined. Exchanging a WebRTC offer.' }
  }
  if (message.type === 'offer' && view.role === 'guest') {
    return { ...view, phase: 'signaling', note: 'Got an offer.' }
  }
  if (message.type === 'answer' && view.role === 'host') {
    return { ...view, phase: 'signaling', note: 'Got an answer.' }
  }
  if (message.type === 'ice' && view.phase === 'signaling') {
    return { ...view, phase: 'connected', note: 'Peer channel is up. Inputs go to the host.' }
  }
  return view
}

export function lobbyCode(bytes = new Uint8Array([4, 18, 90, 7])): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out.slice(0, 4)
}
