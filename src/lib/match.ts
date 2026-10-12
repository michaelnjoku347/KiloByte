import { blocked, PLAYER_RADIUS, type Solid } from './cinder'

export const MATCH_KILLS = 8
export const MATCH_SECONDS = 180

const SPEED = 7.6
const SPRINT = 11
const BOT_SPEED = 4.4
const RANGE = 36

export type WeaponId = 'carbine' | 'shotgun'

type WeaponSpec = {
  mag: number
  reserve: number
  cooldown: number
  reload: number
  pellets: number
  damage: number
  spread: number
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  carbine: { mag: 30, reserve: 90, cooldown: 0.092, reload: 1.25, pellets: 1, damage: 22, spread: 0.02 },
  shotgun: { mag: 6, reserve: 24, cooldown: 0.7, reload: 1.7, pellets: 7, damage: 10, spread: 0.11 },
}

export type Fighter = {
  id: string
  name: string
  x: number
  z: number
  yaw: number
  hp: number
  weapon: WeaponId
  mags: Record<WeaponId, number>
  reserves: Record<WeaponId, number>
  cooldown: number
  reloading: number
  score: number
  bot: boolean
  respawn: number
  think: number
  goalX: number
  goalZ: number
  rgb: [number, number, number]
}

export type MatchInput = {
  forward: number
  strafe: number
  lookX: number
  lookY: number
  fire: boolean
  reload: boolean
  weapon: WeaponId | null
  sprint: boolean
}

export type MatchEvent = 'shot' | 'shotgun' | 'hit' | 'hurt' | 'reload' | 'empty' | 'down'

export type MatchState = {
  time: number
  pitch: number
  fighters: Fighter[]
  events: MatchEvent[]
  over: boolean
  winner: string
}

const WAYPOINTS = [
  { x: 8, z: 10 },
  { x: -8, z: 10 },
  { x: 10, z: -2 },
  { x: -10, z: -2 },
  { x: 0, z: 14 },
  { x: 4, z: 4 },
]

export function emptyInput(): MatchInput {
  return { forward: 0, strafe: 0, lookX: 0, lookY: 0, fire: false, reload: false, weapon: null, sprint: false }
}

function makeFighter(
  id: string,
  name: string,
  x: number,
  z: number,
  yaw: number,
  bot: boolean,
  rgb: [number, number, number],
): Fighter {
  return {
    id,
    name,
    x,
    z,
    yaw,
    hp: 100,
    weapon: 'carbine',
    mags: { carbine: WEAPONS.carbine.mag, shotgun: WEAPONS.shotgun.mag },
    reserves: { carbine: WEAPONS.carbine.reserve, shotgun: WEAPONS.shotgun.reserve },
    cooldown: 0,
    reloading: 0,
    score: 0,
    bot,
    respawn: 0,
    think: 0,
    goalX: x,
    goalZ: z,
    rgb,
  }
}

export function createMatch(): MatchState {
  return {
    time: 0,
    pitch: -0.08,
    over: false,
    winner: '',
    events: [],
    fighters: [
      makeFighter('you', 'You', 0, 8, Math.PI, false, [0.91, 0.72, 0.38]),
      makeFighter('moss', 'Moss', 12, 7, 0, true, [0.32, 0.62, 0.38]),
      makeFighter('kite', 'Kite', -12, 6, 0, true, [0.32, 0.52, 0.82]),
      makeFighter('bramble', 'Bramble', 2, 16, Math.PI, true, [0.75, 0.38, 0.26]),
    ],
  }
}

export function segmentHitsSolid(solids: Solid[], x0: number, z0: number, x1: number, z1: number): boolean {
  const span = Math.hypot(x1 - x0, z1 - z0)
  const steps = Math.max(1, Math.ceil(span / 0.3))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    if (blocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.08, solids)) return true
  }
  return false
}

export function rayDistance(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  cx: number,
  cz: number,
  radius: number,
): number | null {
  const lx = cx - ox
  const lz = cz - oz
  const t = lx * dx + lz * dz
  if (t <= 0) return null
  const px = ox + dx * t
  const pz = oz + dz * t
  const miss = (px - cx) * (px - cx) + (pz - cz) * (pz - cz)
  if (miss > radius * radius) return null
  return Math.max(0, t - Math.sqrt(radius * radius - miss))
}

function cloneFighter(fighter: Fighter): Fighter {
  return {
    ...fighter,
    mags: { ...fighter.mags },
    reserves: { ...fighter.reserves },
    rgb: [...fighter.rgb] as [number, number, number],
  }
}

function moveBody(body: Fighter, forward: number, strafe: number, distance: number, solids: Solid[]) {
  let f = forward
  let s = strafe
  const mag = Math.hypot(f, s)
  if (mag > 1) {
    f /= mag
    s /= mag
  }
  const fx = Math.sin(body.yaw)
  const fz = Math.cos(body.yaw)
  const rx = Math.cos(body.yaw)
  const rz = -Math.sin(body.yaw)
  const dx = (fx * f + rx * s) * distance
  const dz = (fz * f + rz * s) * distance
  const nx = body.x + dx
  if (!blocked(nx, body.z, PLAYER_RADIUS, solids)) body.x = nx
  const nz = body.z + dz
  if (!blocked(body.x, nz, PLAYER_RADIUS, solids)) body.z = nz
}

function startReload(body: Fighter, events: MatchEvent[]) {
  const spec = WEAPONS[body.weapon]
  if (body.reloading > 0) return
  if (body.mags[body.weapon] >= spec.mag) return
  if (body.reserves[body.weapon] <= 0) return
  body.reloading = spec.reload
  events.push('reload')
}

function tickReload(body: Fighter, step: number) {
  if (body.reloading <= 0) return
  body.reloading -= step
  if (body.reloading > 0) return
  body.reloading = 0
  const spec = WEAPONS[body.weapon]
  const need = spec.mag - body.mags[body.weapon]
  const take = Math.min(need, body.reserves[body.weapon])
  body.mags[body.weapon] += take
  body.reserves[body.weapon] -= take
}

function canSee(from: Fighter, to: Fighter, solids: Solid[]): boolean {
  if (Math.hypot(to.x - from.x, to.z - from.z) > 24) return false
  return !segmentHitsSolid(solids, from.x, from.z, to.x, to.z)
}

function fire(
  shooter: Fighter,
  fighters: Fighter[],
  solids: Solid[],
  events: MatchEvent[],
  rand: () => number,
) {
  if (shooter.hp <= 0 || shooter.respawn > 0 || shooter.cooldown > 0 || shooter.reloading > 0) return
  const spec = WEAPONS[shooter.weapon]
  if (shooter.mags[shooter.weapon] <= 0) {
    events.push('empty')
    startReload(shooter, events)
    return
  }
  shooter.mags[shooter.weapon] -= 1
  shooter.cooldown = shooter.bot ? 0.85 : spec.cooldown
  events.push(shooter.weapon === 'shotgun' ? 'shotgun' : 'shot')
  const damage = shooter.bot ? 8 : spec.damage
  for (let pellet = 0; pellet < spec.pellets; pellet++) {
    const yaw = shooter.yaw + (rand() - 0.5) * spec.spread
    const dx = Math.sin(yaw)
    const dz = Math.cos(yaw)
    let best: Fighter | null = null
    let bestT = RANGE
    for (const other of fighters) {
      if (other.id === shooter.id || other.hp <= 0 || other.respawn > 0) continue
      const t = rayDistance(shooter.x, shooter.z, dx, dz, other.x, other.z, 0.62)
      if (t === null || t >= bestT) continue
      const hx = shooter.x + dx * t
      const hz = shooter.z + dz * t
      if (segmentHitsSolid(solids, shooter.x, shooter.z, hx, hz)) continue
      best = other
      bestT = t
    }
    if (!best) continue
    best.hp -= damage
    events.push(best.id === 'you' ? 'hurt' : 'hit')
    if (best.hp <= 0) {
      best.hp = 0
      best.respawn = 3
      shooter.score += 1
      events.push('down')
    }
  }
}

function revive(body: Fighter) {
  body.hp = 100
  body.respawn = 0
  const home = body.id === 'you' ? { x: 0, z: 8 } : { x: body.goalX || body.x, z: body.goalZ || body.z }
  body.x = home.x
  body.z = home.z
}

export function stepMatch(
  prev: MatchState,
  solids: Solid[],
  input: MatchInput,
  dt: number,
  rand: () => number = Math.random,
): MatchState {
  if (prev.over) return { ...prev, events: [] }
  const step = Math.min(Math.max(dt, 0), 0.05)
  const fighters = prev.fighters.map(cloneFighter)
  const events: MatchEvent[] = []
  const you = fighters[0]
  for (const body of fighters) body.cooldown = Math.max(0, body.cooldown - step)

  tickReload(you, step)
  if (you.respawn > 0) {
    you.respawn -= step
    if (you.respawn <= 0) revive(you)
  } else if (you.hp > 0) {
    you.yaw -= input.lookX
    if (input.weapon) you.weapon = input.weapon
    moveBody(you, input.forward, input.strafe, (input.sprint ? SPRINT : SPEED) * step, solids)
    if (input.reload) startReload(you, events)
    if (input.fire) fire(you, fighters, solids, events, rand)
  }

  const pitch = Math.max(-1.05, Math.min(1.05, prev.pitch - input.lookY))

  for (const bot of fighters) {
    if (!bot.bot) continue
    tickReload(bot, step)
    if (bot.respawn > 0) {
      bot.respawn -= step
      if (bot.respawn <= 0) revive(bot)
      continue
    }
    if (bot.hp <= 0) continue
    bot.think -= step
    const seesYou = you.hp > 0 && you.respawn <= 0 && canSee(bot, you, solids)
    if (seesYou) {
      bot.yaw = Math.atan2(you.x - bot.x, you.z - bot.z)
      const dist = Math.hypot(you.x - bot.x, you.z - bot.z)
      if (dist > 6.5) moveBody(bot, 1, 0, BOT_SPEED * step, solids)
      if (dist < 22 && bot.cooldown <= 0 && prev.time > 2.4) fire(bot, fighters, solids, events, rand)
    } else {
      if (bot.think <= 0) {
        const point = WAYPOINTS[Math.floor(rand() * WAYPOINTS.length)]
        bot.goalX = point.x
        bot.goalZ = point.z
        bot.think = 1.4
      }
      bot.yaw = Math.atan2(bot.goalX - bot.x, bot.goalZ - bot.z)
      moveBody(bot, 1, 0, BOT_SPEED * step, solids)
    }
  }

  const time = prev.time + step
  const leader = fighters.reduce((best, body) => (body.score > best.score ? body : best), fighters[0])
  const over = leader.score >= MATCH_KILLS || time >= MATCH_SECONDS
  return {
    time,
    pitch,
    fighters,
    events,
    over,
    winner: over ? leader.name : '',
  }
}

export function touchEmbers(
  you: Fighter,
  shards: { x: number; z: number }[],
  taken: boolean[],
): boolean[] {
  const next = taken.slice()
  if (you.hp <= 0) return next
  for (let i = 0; i < shards.length; i++) {
    if (next[i]) continue
    const dx = you.x - shards[i].x
    const dz = you.z - shards[i].z
    if (dx * dx + dz * dz < 1.15) {
      next[i] = true
      you.hp = Math.min(100, you.hp + 18)
    }
  }
  return next
}

export function clockLabel(time: number): string {
  const left = Math.max(0, Math.ceil(MATCH_SECONDS - time))
  const minutes = Math.floor(left / 60)
  const seconds = left % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
