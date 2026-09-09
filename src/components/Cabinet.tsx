import { useEffect, useRef, useState } from 'react'
import type { GameSpec } from '../types'
import { GameRuntime, type Hud } from '../lib/engine'

const PAD = [
  ['ArrowUp', '↑'],
  ['ArrowLeft', '←'],
  ['ArrowDown', '↓'],
  ['ArrowRight', '→'],
] as const

export function Cabinet({ spec }: { spec: GameSpec }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef(new Set<string>())
  const [hud, setHud] = useState<Hud>({
    mode: 'title',
    score: 0,
    lives: spec.player.hp,
    clock: 0,
    hint: 'Press Start or Space',
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const keys = keysRef.current
    keys.clear()
    const runtime = new GameRuntime(spec, canvas, keys)
    runtime.onHud = setHud
    runtime.start()

    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
      keys.add(e.key)
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      runtime.stop()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [spec])

  const hold = (code: string, on: boolean) => {
    if (on) keysRef.current.add(code)
    else keysRef.current.delete(code)
  }

  return (
    <div className="cabinet" style={{ ['--cab-bg' as string]: spec.palette.bg }}>
      <div className="marquee">
        <span>{spec.title}</span>
        <span>
          {hud.score} pts · {hud.lives} hp · {Math.floor(hud.clock)}s
        </span>
      </div>
      <canvas ref={canvasRef} className="crt" aria-label={`${spec.title} playfield`} />
      <p className="hint-line">{hud.hint}</p>
      <div className="pad" aria-label="Touch controls">
        {PAD.map(([code, label]) => (
          <button
            key={code}
            type="button"
            className={`pad-btn dir ${code}`}
            onPointerDown={(e) => {
              e.preventDefault()
              hold(code, true)
            }}
            onPointerUp={() => hold(code, false)}
            onPointerLeave={() => hold(code, false)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="pad-btn start"
          onClick={() => {
            keysRef.current.add('Start')
            window.setTimeout(() => keysRef.current.delete('Start'), 120)
          }}
        >
          Start
        </button>
        <button
          type="button"
          className="pad-btn shoot"
          onPointerDown={() => hold(' ', true)}
          onPointerUp={() => hold(' ', false)}
          onPointerLeave={() => hold(' ', false)}
        >
          Fire / Jump
        </button>
      </div>
    </div>
  )
}
