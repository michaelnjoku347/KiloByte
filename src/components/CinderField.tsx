import { useEffect, useRef, useState } from 'react'
import {
  cameraRig,
  createYard,
  fillEmberMesh,
  lookAt,
  multiply,
  perspective,
  playerStart,
  SHARD_COUNT,
  stepPlayer,
  type Player,
} from '../lib/cinder'

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aColor;
uniform mat4 uMvp;
out vec3 vColor;
out vec3 vWorld;
void main() {
  vWorld = aPos;
  vColor = aColor;
  gl_Position = uMvp * vec4(aPos, 1.0);
}`

const FRAG = `#version 300 es
precision mediump float;
in vec3 vColor;
in vec3 vWorld;
uniform vec3 uEye;
uniform vec3 uFog;
out vec4 frag;
void main() {
  float dist = length(vWorld - uEye);
  float fog = clamp((dist - 10.0) / 42.0, 0.0, 1.0);
  frag = vec4(mix(vColor, uFog, fog), 1.0);
}`

const FOG = [0.07, 0.08, 0.11]

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function CinderField({ mode }: { mode: 'play' | 'preview' }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const [found, setFound] = useState(0)
  const [locked, setLocked] = useState(false)
  const [full, setFull] = useState(false)
  const play = mode === 'play'

  useEffect(() => {
    const canvas = canvasRef.current
    const shell = shellRef.current
    if (!canvas || !shell) return
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    if (!gl) {
      const ctx = canvas.getContext('2d')
      let frame = 0
      let last = performance.now()
      let smooth = 60
      let alive = true
      const draw = (now: number) => {
        if (!alive) return
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        smooth = smooth * 0.9 + (1 / Math.max(dt, 1 / 480)) * 0.1
        if (fpsRef.current) fpsRef.current.textContent = `${Math.round(smooth)} fps`
        const width = shell.clientWidth || 640
        const height = shell.clientHeight || 360
        canvas.width = width
        canvas.height = height
        if (ctx) {
          const sky = ctx.createLinearGradient(0, 0, 0, height)
          sky.addColorStop(0, '#1b2433')
          sky.addColorStop(1, '#3a2a22')
          ctx.fillStyle = sky
          ctx.fillRect(0, 0, width, height)
        }
        frame = requestAnimationFrame(draw)
      }
      frame = requestAnimationFrame(draw)
      return () => {
        alive = false
        cancelAnimationFrame(frame)
      }
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = vs && fs ? gl.createProgram() : null
    if (!program || !vs || !fs) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    const uMvp = gl.getUniformLocation(program, 'uMvp')
    const uEye = gl.getUniformLocation(program, 'uEye')
    const uFog = gl.getUniformLocation(program, 'uFog')

    const yard = createYard()
    const worldVao = gl.createVertexArray()
    gl.bindVertexArray(worldVao)
    const worldPos = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, worldPos)
    gl.bufferData(gl.ARRAY_BUFFER, yard.positions, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    const worldCol = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, worldCol)
    gl.bufferData(gl.ARRAY_BUFFER, yard.colors, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
    const worldCount = yard.positions.length / 3

    const emberPosData = new Float32Array(SHARD_COUNT * 36 * 3)
    const emberColData = new Float32Array(SHARD_COUNT * 36 * 3)
    const emberVao = gl.createVertexArray()
    gl.bindVertexArray(emberVao)
    const emberPos = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, emberPos)
    gl.bufferData(gl.ARRAY_BUFFER, emberPosData.byteLength, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    const emberCol = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, emberCol)
    gl.bufferData(gl.ARRAY_BUFFER, emberColData.byteLength, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1)

    const keys = new Set<string>()
    const look = { x: 0, y: 0 }
    let player: Player = playerStart()
    let collected = yard.shards.map(() => false)
    let foundCount = 0
    let last = performance.now()
    let smooth = 60
    let frame = 0
    let alive = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let previewTime = 1.2

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, shell.clientWidth)
      const height = Math.max(1, shell.clientHeight)
      const nextW = Math.floor(width * dpr)
      const nextH = Math.floor(height * dpr)
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW
        canvas.height = nextH
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(shell)
    resize()

    const down = (event: KeyboardEvent) => {
      if (!play) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      keys.add(event.key.toLowerCase())
    }
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase())
    const move = (event: MouseEvent) => {
      if (!play || document.pointerLockElement !== canvas) return
      look.x += event.movementX * 0.0022
      look.y += event.movementY * 0.0022
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)

    const draw = (now: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      smooth = smooth * 0.9 + (1 / Math.max(dt, 1 / 480)) * 0.1
      if (fpsRef.current) fpsRef.current.textContent = `${Math.round(smooth)} fps`
      if (play) {
        const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
        const strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
        const stepped = stepPlayer(
          player,
          yard,
          { forward, strafe, lookX: look.x, lookY: look.y },
          dt,
          collected,
        )
        look.x = 0
        look.y = 0
        player = stepped.player
        collected = stepped.collected
        const nextFound = collected.filter(Boolean).length
        if (nextFound !== foundCount) {
          foundCount = nextFound
          setFound(nextFound)
        }
      } else if (!reduced) {
        previewTime += dt
      }
      const rig = cameraRig(player, reduced ? 1.2 : play ? 0 : previewTime, !play)
      const aspect = canvas.width / Math.max(1, canvas.height)
      const mvp = multiply(perspective(1.05, aspect, 0.08, 120), lookAt(rig.eye, rig.center, [0, 1, 0]))
      const emberCount = fillEmberMesh(yard.shards, collected, play ? now / 1000 : previewTime, emberPosData, emberColData)
      gl.bindBuffer(gl.ARRAY_BUFFER, emberPos)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, emberPosData.subarray(0, emberCount * 3))
      gl.bindBuffer(gl.ARRAY_BUFFER, emberCol)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, emberColData.subarray(0, emberCount * 3))
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(program)
      gl.uniformMatrix4fv(uMvp, false, mvp)
      gl.uniform3fv(uEye, rig.eye)
      gl.uniform3fv(uFog, FOG)
      gl.bindVertexArray(worldVao)
      gl.drawArrays(gl.TRIANGLES, 0, worldCount)
      if (emberCount > 0) {
        gl.bindVertexArray(emberVao)
        gl.drawArrays(gl.TRIANGLES, 0, emberCount)
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(worldPos)
      gl.deleteBuffer(worldCol)
      gl.deleteBuffer(emberPos)
      gl.deleteBuffer(emberCol)
      gl.deleteVertexArray(worldVao)
      gl.deleteVertexArray(emberVao)
    }
  }, [play])

  useEffect(() => {
    const onLock = () => setLocked(document.pointerLockElement === canvasRef.current)
    const onFull = () => setFull(document.fullscreenElement === shellRef.current)
    document.addEventListener('pointerlockchange', onLock)
    document.addEventListener('fullscreenchange', onFull)
    return () => {
      document.removeEventListener('pointerlockchange', onLock)
      document.removeEventListener('fullscreenchange', onFull)
    }
  }, [])

  const lookIn = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    void canvas.requestPointerLock()
  }

  return (
    <div className={play ? 'stage-shell' : 'cinder-preview'} ref={shellRef}>
      <canvas ref={canvasRef} className="cinder-canvas" aria-label="Cinder Field, WebGL" />
      <span className="stage-fps" ref={fpsRef}>
        — fps
      </span>
      {play && (
        <>
          <div className="stage-hud">
            <span>
              {found === SHARD_COUNT ? 'Yard clear' : `${found} / ${SHARD_COUNT} embers`}
            </span>
            <button
              type="button"
              className="stage-full"
              onClick={() => {
                const shell = shellRef.current
                if (!shell) return
                if (document.fullscreenElement) void document.exitFullscreen()
                else void shell.requestFullscreen()
              }}
            >
              {full ? 'Window' : 'Fullscreen'}
            </button>
          </div>
          <div className="stage-crosshair" aria-hidden />
          {!locked && (
            <button type="button" className="stage-gate" onClick={lookIn}>
              Click to look
            </button>
          )}
        </>
      )}
    </div>
  )
}
