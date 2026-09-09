import type { GameSpec, Shape } from '../types'
import { mulberry32 } from './hash'

export const VIEW_W = 960
export const VIEW_H = 540

export type EngineMode = 'title' | 'play' | 'win' | 'lose'

export type Hud = {
  mode: EngineMode
  score: number
  lives: number
  clock: number
  hint: string
}

type Ent = {
  kind: 'player' | 'enemy' | 'loot' | 'bullet' | 'brick' | 'platform' | 'ball' | 'hazard' | 'particle'
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  hp: number
  tint?: string
  life?: number
  dead?: boolean
}

type SnakeCell = { x: number; y: number }

export class GameRuntime {
  readonly spec: GameSpec
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly keys: Set<string>
  private ents: Ent[] = []
  private snake: SnakeCell[] = []
  private snakeDir: SnakeCell = { x: 1, y: 0 }
  private queuedDir: SnakeCell = { x: 1, y: 0 }
  private acc = 0
  private invuln = 0
  private shootCd = 0
  private spawnAcc = 0
  private stars: { x: number; y: number; s: number }[] = []
  private raf = 0
  private last = 0
  private running = false
  private audio: AudioContext | null = null
  mode: EngineMode = 'title'
  score = 0
  lives = 1
  clock = 0
  onHud?: (hud: Hud) => void

  constructor(spec: GameSpec, canvas: HTMLCanvasElement, keys: Set<string>) {
    this.spec = spec
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable')
    this.ctx = ctx
    this.keys = keys
    canvas.width = VIEW_W
    canvas.height = VIEW_H
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.reset(true)
    this.last = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const dt = Math.min(0.033, (now - this.last) / 1000)
      this.last = now
      this.tick(dt)
      this.draw()
      this.emit()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    void this.audio?.close()
    this.audio = null
  }

  private emit(): void {
    this.onHud?.({
      mode: this.mode,
      score: this.score,
      lives: this.lives,
      clock: this.clock,
      hint: this.hint(),
    })
  }

  private hint(): string {
    if (this.mode === 'title') return 'Press Start or Space'
    if (this.mode === 'win') return 'Cart cleared'
    if (this.mode === 'lose') return 'Try again'
    const g = this.spec.goal
    if (g.kind === 'survive') return `Survive ${Math.ceil(Math.max(0, g.seconds - this.clock))}s`
    if (g.kind === 'collect') return `Collect ${g.target}`
    if (g.kind === 'clear') return 'Clear the wall'
    return `Score ${g.target}`
  }

  private reset(title: boolean): void {
    this.ents = []
    this.snake = []
    this.acc = 0
    this.invuln = 0
    this.shootCd = 0
    this.spawnAcc = 0
    this.score = 0
    this.clock = 0
    this.lives = this.spec.player.hp
    this.mode = title ? 'title' : 'play'
    const rand = mulberry32(this.spec.seed)
    this.stars = Array.from({ length: 48 }, () => ({
      x: rand() * VIEW_W,
      y: rand() * VIEW_H,
      s: 0.6 + rand() * 1.8,
    }))
    this.setup(rand)
  }

  private setup(rand: () => number): void {
    const { genre, player, swarm, loot } = this.spec
    const ps = player.size
    if (genre === 'snake') {
      this.snake = [
        { x: 8, y: 8 },
        { x: 7, y: 8 },
        { x: 6, y: 8 },
      ]
      this.snakeDir = { x: 1, y: 0 }
      this.queuedDir = { x: 1, y: 0 }
      this.placeFood(rand)
      return
    }
    if (genre === 'breakout') {
      this.ents.push({
        kind: 'player',
        x: VIEW_W / 2 - 54,
        y: VIEW_H - 36,
        w: 108,
        h: 16,
        vx: 0,
        vy: 0,
        hp: 1,
      })
      this.ents.push({
        kind: 'ball',
        x: VIEW_W / 2,
        y: VIEW_H - 80,
        w: 12,
        h: 12,
        vx: 3.2 * (rand() > 0.5 ? 1 : -1),
        vy: -4.2,
        hp: 1,
      })
      const cols = 10
      const rows = 5
      const bw = 84
      const bh = 22
      const ox = 54
      const oy = 56
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.ents.push({
            kind: 'brick',
            x: ox + c * (bw + 6),
            y: oy + r * (bh + 8),
            w: bw,
            h: bh,
            vx: 0,
            vy: 0,
            hp: 1,
            tint: r % 2 ? this.spec.palette.accent : this.spec.palette.loot,
          })
        }
      }
      return
    }
    if (genre === 'platformer') {
      this.ents.push({
        kind: 'player',
        x: 40,
        y: 360,
        w: ps,
        h: ps + 6,
        vx: 0,
        vy: 0,
        hp: player.hp,
      })
      const floors = [
        { x: 0, y: VIEW_H - 28, w: VIEW_W, h: 28 },
        { x: 80, y: 400, w: 180, h: 18 },
        { x: 340, y: 330, w: 200, h: 18 },
        { x: 620, y: 270, w: 180, h: 18 },
        { x: 220, y: 210, w: 160, h: 18 },
        { x: 520, y: 150, w: 220, h: 18 },
        { x: 40, y: 120, w: 140, h: 18 },
      ]
      for (const f of floors) this.ents.push({ kind: 'platform', ...f, vx: 0, vy: 0, hp: 99 })
      for (let i = 0; i < Math.max(6, loot.count); i++) {
        this.ents.push({
          kind: 'loot',
          x: 60 + rand() * (VIEW_W - 100),
          y: 80 + rand() * 300,
          w: 14,
          h: 14,
          vx: 0,
          vy: 0,
          hp: 1,
        })
      }
      for (let i = 0; i < swarm.count; i++) {
        this.ents.push({
          kind: 'enemy',
          x: 120 + rand() * 700,
          y: 90 + rand() * 280,
          w: 22,
          h: 22,
          vx: (rand() > 0.5 ? 1 : -1) * swarm.speed,
          vy: 0,
          hp: 1,
        })
      }
      return
    }
    if (genre === 'shooter') {
      this.ents.push({
        kind: 'player',
        x: VIEW_W / 2 - ps / 2,
        y: VIEW_H - 56,
        w: ps,
        h: ps,
        vx: 0,
        vy: 0,
        hp: player.hp,
      })
      this.spawnWave(rand)
      return
    }
    if (genre === 'dodge') {
      this.ents.push({
        kind: 'player',
        x: VIEW_W / 2 - ps / 2,
        y: VIEW_H - 70,
        w: ps + 4,
        h: ps + 4,
        vx: 0,
        vy: 0,
        hp: player.hp,
      })
      return
    }

    this.ents.push({
      kind: 'player',
      x: VIEW_W / 2 - ps / 2,
      y: VIEW_H / 2 - ps / 2,
      w: ps,
      h: ps,
      vx: 0,
      vy: 0,
      hp: player.hp,
    })
    for (let i = 0; i < loot.count; i++) this.spawnLoot(rand)
    for (let i = 0; i < swarm.count; i++) this.spawnEnemy(rand, true)
  }

  private spawnWave(rand: () => number): void {
    const n = Math.max(4, this.spec.swarm.count + 2)
    for (let i = 0; i < n; i++) {
      this.ents.push({
        kind: 'enemy',
        x: 50 + (i % 8) * 110,
        y: 40 + Math.floor(i / 8) * 48,
        w: 28,
        h: 20,
        vx: this.spec.swarm.speed * (rand() > 0.5 ? 1 : -1),
        vy: 0.25,
        hp: 1,
      })
    }
  }

  private spawnLoot(rand: () => number): void {
    this.ents.push({
      kind: 'loot',
      x: 40 + rand() * (VIEW_W - 80),
      y: 40 + rand() * (VIEW_H - 80),
      w: 14,
      h: 14,
      vx: 0,
      vy: 0,
      hp: 1,
    })
  }

  private spawnEnemy(rand: () => number, far: boolean): void {
    const player = this.player()
    let x = rand() * VIEW_W
    let y = rand() * VIEW_H
    if (far && player) {
      for (let i = 0; i < 8; i++) {
        x = rand() * VIEW_W
        y = rand() * VIEW_H
        if (Math.hypot(x - player.x, y - player.y) > 160) break
      }
    }
    this.ents.push({
      kind: 'enemy',
      x,
      y,
      w: 20,
      h: 20,
      vx: (rand() - 0.5) * this.spec.swarm.speed * 2,
      vy: (rand() - 0.5) * this.spec.swarm.speed * 2,
      hp: 1,
    })
  }

  private placeFood(rand: () => number): void {
    this.ents = this.ents.filter((e) => e.kind !== 'loot')
    const cols = 30
    const rows = 17
    let x = 0
    let y = 0
    for (let i = 0; i < 40; i++) {
      x = 1 + Math.floor(rand() * (cols - 2))
      y = 1 + Math.floor(rand() * (rows - 2))
      if (!this.snake.some((c) => c.x === x && c.y === y)) break
    }
    this.ents.push({ kind: 'loot', x, y, w: 1, h: 1, vx: 0, vy: 0, hp: 1 })
  }

  private player(): Ent | undefined {
    return this.ents.find((e) => e.kind === 'player' && !e.dead)
  }

  private pressed(name: string): boolean {
    return this.keys.has(name)
  }

  private axis(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.pressed('ArrowLeft') || this.pressed('a') || this.pressed('A')) x -= 1
    if (this.pressed('ArrowRight') || this.pressed('d') || this.pressed('D')) x += 1
    if (this.pressed('ArrowUp') || this.pressed('w') || this.pressed('W')) y -= 1
    if (this.pressed('ArrowDown') || this.pressed('s') || this.pressed('S')) y += 1
    return { x, y }
  }

  private startOrRestart(): void {
    if (this.pressed(' ') || this.pressed('Enter') || this.pressed('Start')) {
      if (this.mode === 'title' || this.mode === 'win' || this.mode === 'lose') {
        this.keys.delete(' ')
        this.keys.delete('Enter')
        this.keys.delete('Start')
        this.reset(false)
        this.beep(440, 0.08)
      }
    }
  }

  private tick(dt: number): void {
    this.startOrRestart()
    if (this.mode !== 'play') return
    this.clock += dt
    this.invuln = Math.max(0, this.invuln - dt)
    this.shootCd = Math.max(0, this.shootCd - dt)
    const genre = this.spec.genre
    if (genre === 'snake') this.tickSnake(dt)
    else if (genre === 'breakout') this.tickBreakout(dt)
    else if (genre === 'platformer') this.tickPlatform(dt)
    else if (genre === 'shooter') this.tickShooter(dt)
    else if (genre === 'dodge') this.tickDodge(dt)
    else this.tickArena(dt)
    this.ents = this.ents.filter((e) => !e.dead && (e.life === undefined || e.life > 0))
    this.checkWin()
  }

  private tickSnake(dt: number): void {
    const axis = this.axis()
    if (axis.x && !this.snakeDir.x) this.queuedDir = { x: axis.x, y: 0 }
    if (axis.y && !this.snakeDir.y) this.queuedDir = { x: 0, y: axis.y }
    this.acc += dt
    const step = Math.max(0.08, 0.18 - this.spec.player.speed * 0.012)
    if (this.acc < step) return
    this.acc = 0
    this.snakeDir = this.queuedDir
    const head = this.snake[0]
    if (!head) return
    let nx = head.x + this.snakeDir.x
    let ny = head.y + this.snakeDir.y
    if (this.spec.world.wrap) {
      nx = (nx + 30) % 30
      ny = (ny + 17) % 17
    } else if (nx < 0 || ny < 0 || nx >= 30 || ny >= 17) {
      this.die()
      return
    }
    if (this.snake.some((c) => c.x === nx && c.y === ny)) {
      this.die()
      return
    }
    this.snake.unshift({ x: nx, y: ny })
    const food = this.ents.find((e) => e.kind === 'loot')
    if (food && food.x === nx && food.y === ny) {
      this.score += this.spec.loot.value
      this.burst(nx * 32 + 16, ny * 32 + 16, this.spec.palette.loot)
      this.beep(720, 0.06)
      this.placeFood(mulberry32(this.spec.seed + this.score * 13))
    } else {
      this.snake.pop()
    }
  }

  private tickBreakout(dt: number): void {
    const paddle = this.player()
    const ball = this.ents.find((e) => e.kind === 'ball')
    if (!paddle || !ball) return
    const axis = this.axis()
    paddle.x += axis.x * this.spec.player.speed * 180 * dt
    paddle.x = clamp(paddle.x, 8, VIEW_W - paddle.w - 8)
    ball.x += ball.vx * 60 * dt
    ball.y += ball.vy * 60 * dt
    if (ball.x < 8 || ball.x + ball.w > VIEW_W - 8) ball.vx *= -1
    if (ball.y < 8) ball.vy *= -1
    if (ball.y > VIEW_H) {
      this.die()
      return
    }
    if (aabb(ball, paddle) && ball.vy > 0) {
      ball.vy *= -1
      ball.vx += axis.x * 1.2
      ball.y = paddle.y - ball.h - 1
      this.beep(280, 0.04)
    }
    for (const brick of this.ents) {
      if (brick.kind !== 'brick' || brick.dead) continue
      if (aabb(ball, brick)) {
        brick.dead = true
        ball.vy *= -1
        this.score += 1
        this.burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.tint ?? this.spec.palette.accent)
        this.beep(520, 0.05)
      }
    }
  }

  private tickPlatform(dt: number): void {
    const p = this.player()
    if (!p) return
    const axis = this.axis()
    p.vx = axis.x * this.spec.player.speed * 90
    p.vy += this.spec.world.gravity * 1400 * dt
    const jump = this.pressed(' ') || this.pressed('ArrowUp') || this.pressed('w') || this.pressed('W')
    const platforms = this.ents.filter((e) => e.kind === 'platform')
    const onGround = platforms.some(
      (f) =>
        p.y + p.h <= f.y + 6 &&
        p.y + p.h >= f.y - 8 &&
        p.x + p.w > f.x + 4 &&
        p.x < f.x + f.w - 4 &&
        p.vy >= 0,
    )
    if (jump && onGround) {
      p.vy = -420
      this.beep(360, 0.05)
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.x = clamp(p.x, 0, VIEW_W - p.w)
    for (const f of platforms) {
      if (p.x + p.w > f.x + 4 && p.x < f.x + f.w - 4) {
        if (p.vy >= 0 && p.y + p.h >= f.y && p.y + p.h <= f.y + f.h + 16) {
          p.y = f.y - p.h
          p.vy = 0
        }
      }
    }
    if (p.y > VIEW_H) this.die()
    this.collectAndBump(p)
    for (const e of this.ents) {
      if (e.kind !== 'enemy') continue
      e.x += e.vx * 40 * dt
      const floor = platforms.find(
        (f) => e.y + e.h <= f.y + 8 && e.x + e.w > f.x && e.x < f.x + f.w,
      )
      if (floor) e.y = floor.y - e.h
      if (e.x < 8 || e.x > VIEW_W - 32) e.vx *= -1
    }
  }

  private tickShooter(dt: number): void {
    const p = this.player()
    if (!p) return
    const axis = this.axis()
    p.x += axis.x * this.spec.player.speed * 140 * dt
    p.x = clamp(p.x, 8, VIEW_W - p.w - 8)
    if ((this.pressed(' ') || this.pressed('Shoot')) && this.shootCd === 0) {
      this.ents.push({
        kind: 'bullet',
        x: p.x + p.w / 2 - 3,
        y: p.y - 10,
        w: 6,
        h: 14,
        vx: 0,
        vy: -520,
        hp: 1,
      })
      this.shootCd = 0.22
      this.beep(680, 0.04)
    }
    for (const e of this.ents) {
      if (e.kind === 'bullet') {
        e.y += e.vy * dt
        if (e.y < -20) e.dead = true
      }
      if (e.kind === 'enemy') {
        e.x += e.vx * 40 * dt
        e.y += this.spec.swarm.speed * 12 * dt
        if (e.x < 20 || e.x > VIEW_W - 40) e.vx *= -1
        if (e.y > VIEW_H - 80) this.die()
      }
    }
    for (const b of this.ents) {
      if (b.kind !== 'bullet') continue
      for (const e of this.ents) {
        if (e.kind !== 'enemy' || e.dead) continue
        if (aabb(b, e)) {
          e.dead = true
          b.dead = true
          this.score += 1
          this.burst(e.x + e.w / 2, e.y + e.h / 2, this.spec.palette.enemy)
        }
      }
    }
    this.hurtOnTouch(p)
    if (!this.ents.some((e) => e.kind === 'enemy')) this.spawnWave(mulberry32(this.spec.seed + this.score))
  }

  private tickDodge(dt: number): void {
    const p = this.player()
    if (!p) return
    const axis = this.axis()
    p.x += axis.x * this.spec.player.speed * 160 * dt
    p.x = clamp(p.x, 8, VIEW_W - p.w - 8)
    this.spawnAcc += dt
    if (this.spawnAcc > Math.max(0.18, 0.55 - this.clock * 0.008)) {
      this.spawnAcc = 0
      const w = 16 + Math.random() * 28
      this.ents.push({
        kind: 'hazard',
        x: 10 + Math.random() * (VIEW_W - 40),
        y: -30,
        w,
        h: w,
        vx: (Math.random() - 0.5) * 40,
        vy: 140 + this.spec.swarm.speed * 40 + this.clock * 4,
        hp: 1,
      })
    }
    for (const h of this.ents) {
      if (h.kind !== 'hazard') continue
      h.x += h.vx * dt
      h.y += h.vy * dt
      if (h.y > VIEW_H + 40) h.dead = true
      if (aabb(p, h)) this.die()
    }
  }

  private tickArena(dt: number): void {
    const p = this.player()
    if (!p) return
    const axis = this.axis()
    const spd = this.spec.player.speed * 110
    p.x += axis.x * spd * dt
    p.y += axis.y * spd * dt
    if (this.spec.world.wrap) {
      p.x = (p.x + VIEW_W) % VIEW_W
      p.y = (p.y + VIEW_H) % VIEW_H
    } else {
      p.x = clamp(p.x, 8, VIEW_W - p.w - 8)
      p.y = clamp(p.y, 8, VIEW_H - p.h - 8)
    }
    const playerCx = p.x + p.w / 2
    const playerCy = p.y + p.h / 2
    for (const e of this.ents) {
      if (e.kind !== 'enemy') continue
      if (this.spec.swarm.behavior === 'chase') {
        const dx = playerCx - (e.x + e.w / 2)
        const dy = playerCy - (e.y + e.h / 2)
        const mag = Math.hypot(dx, dy) || 1
        e.vx = (dx / mag) * this.spec.swarm.speed * 70
        e.vy = (dy / mag) * this.spec.swarm.speed * 70
      } else if (this.spec.swarm.behavior === 'bounce') {
        if (e.x < 0 || e.x > VIEW_W - e.w) e.vx *= -1
        if (e.y < 0 || e.y > VIEW_H - e.h) e.vy *= -1
      } else if (this.spec.swarm.behavior === 'swoop') {
        e.vx += Math.sin(this.clock * 3 + e.y) * 20
      }
      e.x += e.vx * dt
      e.y += e.vy * dt
      if (this.spec.world.wrap) {
        e.x = (e.x + VIEW_W) % VIEW_W
        e.y = (e.y + VIEW_H) % VIEW_H
      }
    }
    this.collectAndBump(p)
    this.hurtOnTouch(p)
    if (this.spec.genre === 'survive') {
      this.spawnAcc += dt
      if (this.spawnAcc > 3 && this.ents.filter((e) => e.kind === 'enemy').length < 12) {
        this.spawnAcc = 0
        this.spawnEnemy(Math.random, true)
      }
    }
  }

  private collectAndBump(p: Ent): void {
    for (const e of this.ents) {
      if (e.kind !== 'loot' || e.dead) continue
      if (aabb(p, e)) {
        e.dead = true
        this.score += this.spec.loot.value
        this.burst(e.x, e.y, this.spec.palette.loot)
        this.beep(760, 0.05)
      }
    }
  }

  private hurtOnTouch(p: Ent): void {
    if (this.invuln > 0) return
    for (const e of this.ents) {
      if (e.kind !== 'enemy' || e.dead) continue
      if (aabb(p, e)) {
        this.die()
        return
      }
    }
  }

  private die(): void {
    if (this.invuln > 0) return
    this.lives -= 1
    this.invuln = 1.1
    this.beep(140, 0.12)
    const p = this.player()
    if (p) this.burst(p.x, p.y, this.spec.palette.player)
    if (this.lives <= 0) this.mode = 'lose'
  }

  private checkWin(): void {
    const g = this.spec.goal
    if (g.kind === 'survive' && this.clock >= g.seconds) this.mode = 'win'
    if (g.kind === 'score' && this.score >= g.target) this.mode = 'win'
    if (g.kind === 'collect' && this.score >= g.target) this.mode = 'win'
    if (g.kind === 'clear' && !this.ents.some((e) => e.kind === 'brick')) this.mode = 'win'
  }

  private burst(x: number, y: number, tint: string): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      this.ents.push({
        kind: 'particle',
        x,
        y,
        w: 4,
        h: 4,
        vx: Math.cos(a) * 80,
        vy: Math.sin(a) * 80,
        hp: 1,
        tint,
        life: 0.35,
      })
    }
  }

  private beep(freq: number, dur: number): void {
    try {
      if (!this.audio) this.audio = new AudioContext()
      const ctx = this.audio
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'square'
      gain.gain.value = 0.04
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + dur)
    } catch {
      /* audio optional */
    }
  }

  private draw(): void {
    const { ctx, spec } = this
    ctx.fillStyle = spec.palette.bg
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    if (spec.world.stars) {
      ctx.fillStyle = spec.palette.paper
      for (const s of this.stars) {
        ctx.globalAlpha = 0.25
        ctx.fillRect(s.x, s.y, s.s, s.s)
      }
      ctx.globalAlpha = 1
    }
    if (spec.genre === 'snake') {
      this.drawSnake()
    } else {
      for (const e of this.ents) this.drawEnt(e)
    }
    for (const e of this.ents) {
      if (e.kind !== 'particle') continue
      e.x += e.vx * 0.016
      e.y += e.vy * 0.016
      e.life = (e.life ?? 0) - 0.016
      ctx.globalAlpha = Math.max(0, e.life ?? 0)
      ctx.fillStyle = e.tint ?? spec.palette.accent
      ctx.fillRect(e.x, e.y, e.w, e.h)
      ctx.globalAlpha = 1
    }
    if (this.mode !== 'play') {
      ctx.fillStyle = 'rgba(8,6,4,0.55)'
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
      ctx.fillStyle = spec.palette.paper
      ctx.font = '700 42px Fraunces, serif'
      ctx.textAlign = 'center'
      const label =
        this.mode === 'title' ? spec.title : this.mode === 'win' ? 'CLEARED' : 'TILT'
      ctx.fillText(label, VIEW_W / 2, VIEW_H / 2 - 12)
      ctx.font = '500 18px Outfit, sans-serif'
      ctx.fillStyle = spec.palette.accent
      ctx.fillText(this.hint(), VIEW_W / 2, VIEW_H / 2 + 28)
    }
  }

  private drawSnake(): void {
    const cell = 32
    const { ctx, spec } = this
    ctx.fillStyle = spec.palette.paper
    ctx.globalAlpha = 0.05
    for (let x = 0; x < 30; x++) ctx.fillRect(x * cell, 0, 1, VIEW_H)
    for (let y = 0; y < 17; y++) ctx.fillRect(0, y * cell, VIEW_W, 1)
    ctx.globalAlpha = 1
    for (const [i, c] of this.snake.entries()) {
      ctx.fillStyle = i === 0 ? spec.palette.player : spec.palette.accent
      ctx.fillRect(c.x * cell + 2, c.y * cell + 2, cell - 4, cell - 4)
    }
    const food = this.ents.find((e) => e.kind === 'loot')
    if (food) {
      ctx.fillStyle = spec.palette.loot
      ctx.beginPath()
      ctx.arc(food.x * cell + 16, food.y * cell + 16, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawEnt(e: Ent): void {
    const { ctx, spec } = this
    if (e.kind === 'particle') return
    if (e.kind === 'platform') {
      ctx.fillStyle = spec.palette.paper
      ctx.globalAlpha = 0.22
      ctx.fillRect(e.x, e.y, e.w, e.h)
      ctx.globalAlpha = 1
      ctx.fillStyle = spec.palette.accent
      ctx.fillRect(e.x, e.y, e.w, 4)
      return
    }
    if (e.kind === 'brick') {
      ctx.fillStyle = e.tint ?? spec.palette.accent
      roundRect(ctx, e.x, e.y, e.w, e.h, 4)
      ctx.fill()
      return
    }
    if (e.kind === 'loot') {
      ctx.fillStyle = spec.palette.loot
      ctx.beginPath()
      ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    if (e.kind === 'bullet') {
      ctx.fillStyle = spec.palette.player
      ctx.fillRect(e.x, e.y, e.w, e.h)
      return
    }
    if (e.kind === 'ball') {
      ctx.fillStyle = spec.palette.paper
      ctx.beginPath()
      ctx.arc(e.x + 6, e.y + 6, 7, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    const color =
      e.kind === 'player'
        ? spec.palette.player
        : e.kind === 'hazard'
          ? spec.palette.enemy
          : spec.palette.enemy
    if (e.kind === 'player' && this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.35
    }
    drawShape(ctx, e.kind === 'player' ? spec.player.shape : 'square', e.x, e.y, e.w, e.h, color)
    ctx.globalAlpha = 1
  }
}

function aabb(a: Ent, b: Ent): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color
  const cx = x + w / 2
  const cy = y + h / 2
  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(cx, cy, w / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (shape === 'triangle' || shape === 'ship') {
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
    ctx.fill()
    return
  }
  if (shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, cy)
    ctx.lineTo(cx, y + h)
    ctx.lineTo(x, cy)
    ctx.closePath()
    ctx.fill()
    return
  }
  ctx.fillRect(x, y, w, h)
}
