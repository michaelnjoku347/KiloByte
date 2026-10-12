import { useState } from 'react'
import { cloudClient, readCloudConfig } from '../lib/cloud'
import { applySignal, freshLobby, hostLobby, joinLobby, lobbyCode, type LobbyView, type Signal } from '../lib/lobby'
import { acceptSignal, openPeer } from '../lib/net'

export function LobbyPanel() {
  const configured = readCloudConfig() !== null
  const [view, setView] = useState<LobbyView>(freshLobby())
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async (role: 'host' | 'guest', room: string) => {
    const pending = cloudClient()
    if (!pending) return
    setBusy(true)
    try {
      const client = await pending
      const session = await client.auth.getSession()
      if (!session.data.session) {
        setView({ ...freshLobby(), note: 'Sign in with the Supabase email on the You page before opening a lobby.' })
        return
      }
      const next = role === 'host' ? hostLobby(room) : joinLobby(room)
      setView(next)
      setCode(room)
      const channel = client.channel(`lobby:${room}`, { config: { broadcast: { self: false } } })
      let link: Awaited<ReturnType<typeof openPeer>> | null = null
      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        const message = payload as Signal
        setView((current) => applySignal(current, message))
        if (!link) return
        void acceptSignal(link.pc, role, message, (out) => {
          void channel.send({ type: 'broadcast', event: 'signal', payload: out })
        })
      })
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 4000)
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(timer)
            resolve()
          }
        })
      })
      link = await openPeer(
        role,
        (message) => {
          void channel.send({ type: 'broadcast', event: 'signal', payload: message })
        },
        () => undefined,
      )
      if (role === 'host') {
        await client.from('lobbies').insert({ id: room, host_id: session.data.session.user.id, game_id: 'house_cinder_field' })
      }
    } catch (err) {
      setView({ ...freshLobby(), note: err instanceof Error ? err.message : 'Lobby failed. Versus bots is still available.' })
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <section className="panel lobby-panel">
        <h2>Online match</h2>
        <p>
          Versus bots works on this device, including offline after the app has been opened once.
          A live lobby needs a free Supabase project so two browsers can exchange WebRTC signaling.
          Game traffic then goes peer to peer. This screen does not invent a second player.
        </p>
      </section>
    )
  }

  return (
    <section className="panel lobby-panel">
      <h2>Online match</h2>
      <p>{view.note || 'Host a code or join one. The host runs the match. Bots fill empty seats.'}</p>
      <div className="hero-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={busy}
          onClick={() => {
            const bytes = new Uint8Array(4)
            crypto.getRandomValues(bytes)
            void start('host', lobbyCode(bytes))
          }}
        >
          Host lobby
        </button>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code" aria-label="Lobby code" />
        <button type="button" className="ghost-btn" disabled={busy} onClick={() => void start('guest', code.trim().slice(0, 4))}>
          Join
        </button>
      </div>
      {view.phase !== 'idle' && view.code && <p className="meter-line">Code {view.code} · {view.phase}</p>}
    </section>
  )
}
