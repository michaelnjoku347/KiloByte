import type { Signal } from './lobby'

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }]

export type PeerLink = {
  pc: RTCPeerConnection
  channel: RTCDataChannel | null
  close: () => void
}

export async function openPeer(
  role: 'host' | 'guest',
  send: (message: Signal) => void,
  onData: (data: string) => void,
): Promise<PeerLink> {
  const pc = new RTCPeerConnection({ iceServers: ICE })
  let channel: RTCDataChannel | null = null
  const arm = (next: RTCDataChannel) => {
    channel = next
    next.onmessage = (event) => onData(String(event.data))
  }
  pc.onicecandidate = (event) => {
    if (event.candidate) send({ type: 'ice', candidate: JSON.stringify(event.candidate) })
  }
  pc.ondatachannel = (event) => arm(event.channel)
  if (role === 'host') {
    arm(pc.createDataChannel('match'))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    send({ type: 'offer', sdp: offer.sdp ?? '' })
  }
  return {
    pc,
    get channel() {
      return channel
    },
    close: () => pc.close(),
  }
}

export async function acceptSignal(pc: RTCPeerConnection, role: 'host' | 'guest', message: Signal, send: (message: Signal) => void) {
  if (message.type === 'offer' && role === 'guest') {
    await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    send({ type: 'answer', sdp: answer.sdp ?? '' })
  } else if (message.type === 'answer' && role === 'host') {
    await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp })
  } else if (message.type === 'ice') {
    await pc.addIceCandidate(JSON.parse(message.candidate) as RTCIceCandidateInit)
  }
}
