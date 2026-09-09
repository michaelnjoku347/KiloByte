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

export type GithubSource = {
  kind: 'github'
  owner: string
  repo: string
  branch: string
  path: string
  playUrl: string
  htmlUrl: string
}

export type HtmlSource = {
  kind: 'html'
  entry: string
  href: string
}

export type UploadSource = {
  kind: 'upload'
  entry: string
}

export type CartSource = {
  kind: 'cart'
  spec: GameSpec
}

export type GameSource = GithubSource | HtmlSource | UploadSource | CartSource

export type GameRecord = {
  id: string
  title: string
  author: string
  blurb: string
  description: string
  genres: string[]
  createdAt: string
  cover: string
  palette: Pick<Palette, 'bg' | 'paper' | 'accent'>
  house?: boolean
  bytes: number
  visits?: number
  source: GameSource
}

export type ArcadeSettings = {
  author: string
  geminiKey: string
  githubToken: string
  theme: SiteTheme
}

export type SiteTheme = 'light' | 'dark'

export type UserProfile = {
  handle: string
  displayName: string
  bio: string
  createdAt: string
  salt?: string
  hash?: string
  githubLogin?: string
}

export type ArcadeState = {
  games: GameRecord[]
  settings: ArcadeSettings
  plays: Record<string, number>
  recents: string[]
  favorites: string[]
  profile: UserProfile | null
  signedIn: boolean
}

export type CreateTab = 'generate' | 'upload' | 'github'

export type Route =
  | { name: 'arcade' }
  | { name: 'charts'; genre?: string }
  | { name: 'search'; query: string }
  | { name: 'create'; tab: CreateTab }
  | { name: 'why' }
  | { name: 'you' }
  | { name: 'game'; id: string }
  | { name: 'play'; id: string }
  | { name: 'share'; payload: string }

export type SourceFilter = 'all' | 'house' | 'mine' | 'github' | 'upload' | 'cart'

export type BrowseSort = 'new' | 'title' | 'played' | 'genre'
