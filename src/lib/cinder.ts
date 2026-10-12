export type Player = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}

export type MoveInput = {
  forward: number
  strafe: number
  lookX: number
  lookY: number
}

export type Solid = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type Shard = {
  x: number
  z: number
}

export type Yard = {
  positions: Float32Array
  colors: Float32Array
  solids: Solid[]
  shards: Shard[]
}

export const PLAYER_RADIUS = 0.45
export const SHARD_COUNT = 8
const SPEED = 7.6

export function playerStart(): Player {
  return { x: 0, y: 1.62, z: 8, yaw: Math.PI, pitch: -0.16 }
}

export function blocked(x: number, z: number, radius: number, solids: Solid[]): boolean {
  const r2 = radius * radius
  for (const box of solids) {
    const cx = Math.max(box.minX, Math.min(x, box.maxX))
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ))
    const dx = x - cx
    const dz = z - cz
    if (dx * dx + dz * dz < r2) return true
  }
  return false
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pushBox(
  pos: number[],
  col: number[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  rgb: [number, number, number],
) {
  const faces: [number, number[][]][] = [
    [
      1,
      [
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
        [x0, y1, z1],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
    ],
    [
      0.28,
      [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1],
      ],
    ],
    [
      0.72,
      [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
    ],
    [
      0.46,
      [
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
      ],
    ],
    [
      0.88,
      [
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y0, z1],
        [x1, y1, z0],
        [x1, y1, z1],
      ],
    ],
    [
      0.4,
      [
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y0, z0],
        [x0, y1, z1],
        [x0, y1, z0],
      ],
    ],
  ]
  for (const [light, verts] of faces) {
    const r = rgb[0] * light
    const g = rgb[1] * light
    const b = rgb[2] * light
    for (const v of verts) {
      pos.push(v[0], v[1], v[2])
      col.push(r, g, b)
    }
  }
}

export function createYard(seed = 20260320): Yard {
  const rand = mulberry32(seed)
  const pos: number[] = []
  const col: number[] = []
  const solids: Solid[] = []
  const tones: [number, number, number][] = [
    [0.23, 0.25, 0.3],
    [0.48, 0.28, 0.16],
    [0.16, 0.34, 0.36],
    [0.58, 0.4, 0.18],
    [0.17, 0.18, 0.22],
  ]

  for (let gz = -24; gz <= 20; gz += 4) {
    for (let gx = -24; gx <= 24; gx += 4) {
      const tone = 0.16 + rand() * 0.06
      const warm = rand() > 0.82 ? 0.08 : 0
      pushBox(pos, col, gx, -0.45, gz, gx + 3.92, 0, gz + 3.92, [tone + warm, tone, tone + 0.02])
    }
  }

  const landmark: [number, number, number, number, number, number, [number, number, number]][] = [
    [-1.4, 0, -9.2, 1.4, 7.2, -6.2, [0.62, 0.34, 0.16]],
    [-4.2, 0, -8.4, -1.7, 2.4, -6.4, [0.2, 0.24, 0.28]],
    [1.7, 0, -8.6, 4.4, 3.1, -6.6, [0.15, 0.32, 0.34]],
  ]
  for (const [x0, y0, z0, x1, y1, z1, rgb] of landmark) {
    pushBox(pos, col, x0, y0, z0, x1, y1, z1, rgb)
    solids.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 })
  }

  for (let i = 0; i < 34; i++) {
    const angle = rand() * Math.PI * 2
    const radius = 6.5 + rand() * 15
    const w = 1.1 + rand() * 2.4
    const d = 1.1 + rand() * 2.6
    const h = 1.2 + rand() * 6.5
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (Math.hypot(x, z) < 11) continue
    const x0 = x - w / 2
    const z0 = z - d / 2
    const x1 = x + w / 2
    const z1 = z + d / 2
    if (blocked(x, z, 1.2, solids)) continue
    const rgb = tones[i % tones.length]
    pushBox(pos, col, x0, 0, z0, x1, h, z1, rgb)
    solids.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 })
  }

  const shards: Shard[] = []
  for (let i = 0; i < SHARD_COUNT; i++) {
    const angle = (i / SHARD_COUNT) * Math.PI * 2 + 0.35
    const radius = 7.5 + (i % 4) * 2.1
    let x = Math.cos(angle) * radius
    let z = Math.sin(angle) * radius
    for (let n = 0; n < 10 && blocked(x, z, 0.7, solids); n++) {
      x *= 1.12
      z *= 1.12
    }
    shards.push({ x, z })
  }

  return {
    positions: Float32Array.from(pos),
    colors: Float32Array.from(col),
    solids,
    shards,
  }
}

export function stepPlayer(
  player: Player,
  yard: Yard,
  input: MoveInput,
  dt: number,
  collected: boolean[],
): { player: Player; collected: boolean[] } {
  const step = Math.min(Math.max(dt, 0), 0.05)
  let forward = input.forward
  let strafe = input.strafe
  const mag = Math.hypot(forward, strafe)
  if (mag > 1) {
    forward /= mag
    strafe /= mag
  }
  const fx = Math.sin(player.yaw)
  const fz = Math.cos(player.yaw)
  const rx = Math.cos(player.yaw)
  const rz = -Math.sin(player.yaw)
  const dx = (fx * forward + rx * strafe) * SPEED * step
  const dz = (fz * forward + rz * strafe) * SPEED * step
  let x = player.x + dx
  if (blocked(x, player.z, PLAYER_RADIUS, yard.solids)) x = player.x
  let z = player.z + dz
  if (blocked(x, z, PLAYER_RADIUS, yard.solids)) z = player.z
  const nextCollected = collected.slice()
  for (let i = 0; i < yard.shards.length; i++) {
    if (nextCollected[i]) continue
    const shard = yard.shards[i]
    const sx = x - shard.x
    const sz = z - shard.z
    if (sx * sx + sz * sz < 1.15) nextCollected[i] = true
  }
  return {
    player: {
      x,
      y: player.y,
      z,
      yaw: player.yaw - input.lookX,
      pitch: Math.max(-1.15, Math.min(1.15, player.pitch - input.lookY)),
    },
    collected: nextCollected,
  }
}

export function cameraRig(player: Player, time: number, preview: boolean): { eye: number[]; center: number[] } {
  if (preview) {
    const angle = time * 0.16
    const eye = [Math.sin(angle) * 18, 8.2, Math.cos(angle) * 18]
    return { eye, center: [0, 2.4, -7] }
  }
  const cp = Math.cos(player.pitch)
  const eye = [player.x, 1.62, player.z]
  return {
    eye,
    center: [
      eye[0] + Math.sin(player.yaw) * cp,
      eye[1] + Math.sin(player.pitch),
      eye[2] + Math.cos(player.yaw) * cp,
    ],
  }
}

const BOX_LIGHTS = [1, 0.28, 0.72, 0.46, 0.88, 0.4]
const BOX_CORNERS = new Float32Array(24)
const BOX_FACES = [
  7, 6, 5, 7, 5, 4, 0, 1, 2, 0, 2, 3, 3, 2, 6, 3, 6, 7, 1, 0, 4, 1, 4, 5, 2, 1, 5, 2, 5, 6, 0, 3, 7, 0, 7, 4,
]

function writeBox(
  pos: Float32Array,
  col: Float32Array,
  offset: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  rgb: [number, number, number],
): number {
  const corners = BOX_CORNERS
  corners[0] = x0
  corners[1] = y0
  corners[2] = z0
  corners[3] = x1
  corners[4] = y0
  corners[5] = z0
  corners[6] = x1
  corners[7] = y0
  corners[8] = z1
  corners[9] = x0
  corners[10] = y0
  corners[11] = z1
  corners[12] = x0
  corners[13] = y1
  corners[14] = z0
  corners[15] = x1
  corners[16] = y1
  corners[17] = z0
  corners[18] = x1
  corners[19] = y1
  corners[20] = z1
  corners[21] = x0
  corners[22] = y1
  corners[23] = z1
  let cursor = offset
  for (let face = 0; face < 6; face++) {
    const light = BOX_LIGHTS[face]
    const r = rgb[0] * light
    const g = rgb[1] * light
    const b = rgb[2] * light
    for (let v = 0; v < 6; v++) {
      const corner = BOX_FACES[face * 6 + v] * 3
      const p = cursor * 3
      pos[p] = corners[corner]
      pos[p + 1] = corners[corner + 1]
      pos[p + 2] = corners[corner + 2]
      col[p] = r
      col[p + 1] = g
      col[p + 2] = b
      cursor += 1
    }
  }
  return cursor
}

export function fillEmberMesh(
  shards: Shard[],
  collected: boolean[],
  time: number,
  positions: Float32Array,
  colors: Float32Array,
): number {
  let cursor = 0
  for (let index = 0; index < shards.length; index++) {
    if (collected[index]) continue
    const shard = shards[index]
    const bob = 0.85 + Math.sin(time * 3 + index) * 0.16
    const s = 0.22
    cursor = writeBox(
      positions,
      colors,
      cursor,
      shard.x - s,
      bob,
      shard.z - s,
      shard.x + s,
      bob + s * 2,
      shard.z + s,
      [1, 0.74, 0.28],
    )
  }
  return cursor
}

export function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  const out = new Float32Array(16)
  out[0] = f / aspect
  out[5] = f
  out[10] = (far + near) * nf
  out[11] = -1
  out[14] = 2 * far * near * nf
  return out
}

export function lookAt(eye: number[], center: number[], up: number[]): Float32Array {
  let zx = eye[0] - center[0]
  let zy = eye[1] - center[1]
  let zz = eye[2] - center[2]
  let len = Math.hypot(zx, zy, zz) || 1
  zx /= len
  zy /= len
  zz /= len
  let xx = up[1] * zz - up[2] * zy
  let xy = up[2] * zx - up[0] * zz
  let xz = up[0] * zy - up[1] * zx
  len = Math.hypot(xx, xy, xz) || 1
  xx /= len
  xy /= len
  xz /= len
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx
  const out = new Float32Array(16)
  out[0] = xx
  out[1] = yx
  out[2] = zx
  out[4] = xy
  out[5] = yy
  out[6] = zy
  out[8] = xz
  out[9] = yz
  out[10] = zz
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2])
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2])
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2])
  out[15] = 1
  return out
}

export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3]
    }
  }
  return out
}
