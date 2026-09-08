export type Genre =
  | 'collector'
  | 'shooter'
  | 'dodge'
  | 'snake'
  | 'breakout'
  | 'platformer'
  | 'survive'

export type Shape = 'square' | 'circle' | 'triangle' | 'ship' | 'diamond'

export type Behavior = 'chase' | 'drift' | 'bounce' | 'swoop'

export type GoalKind = 'score' | 'survive' | 'collect' | 'clear'

export type Palette = {
  bg: string
  paper: string
  accent: string
  player: string
  enemy: string
  loot: string
}

export type GameSpec = {
  v: 1
  id: string
  title: string
  author: string
  prompt: string
  blurb: string
  createdAt: string
  genre: Genre
  theme: string
  seed: number
  house?: boolean
  palette: Palette
  player: {
    shape: Shape
    speed: number
    size: number
    hp: number
  }
  world: {
    wrap: boolean
    gravity: number
    stars: boolean
  }
  goal: {
    kind: GoalKind
    target: number
    seconds: number
  }
  swarm: {
    count: number
    speed: number
    behavior: Behavior
  }
  loot: {
    count: number
    value: number
  }
}

export type ArcadeSettings = {
  author: string
  geminiKey: string
}

export type ArcadeState = {
  carts: GameSpec[]
  settings: ArcadeSettings
}

export type Route =
  | { name: 'arcade' }
  | { name: 'studio' }
  | { name: 'why' }
  | { name: 'play'; id: string }
  | { name: 'share'; payload: string }
