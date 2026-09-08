import type { CreateTab, Route } from '../types'

const TABS: CreateTab[] = ['generate', 'upload', 'github']

function createTab(value: string | undefined): CreateTab {
  return TABS.includes(value as CreateTab) ? (value as CreateTab) : 'generate'
}

export function parseHash(hash: string): Route {
  const trimmed = hash.replace(/^#/, '')
  const parts = trimmed.split('/').filter(Boolean)
  const head = parts[0]
  if (head === 'studio') return { name: 'create', tab: 'generate' }
  if (head === 'create') return { name: 'create', tab: createTab(parts[1]) }
  if (head === 'why') return { name: 'why' }
  if (head === 'game' && parts[1]) return { name: 'game', id: parts[1] }
  if (head === 'play' && parts[1]) return { name: 'play', id: parts[1] }
  if (head === 'c' && parts[1]) return { name: 'share', payload: parts.slice(1).join('/') }
  return { name: 'arcade' }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'create':
      return `#/create/${route.tab}`
    case 'why':
      return '#/why'
    case 'game':
      return `#/game/${route.id}`
    case 'play':
      return `#/play/${route.id}`
    case 'share':
      return `#/c/${route.payload}`
    default:
      return '#/'
  }
}

export function go(route: Route): void {
  const next = toHash(route)
  if (location.hash !== next) location.hash = next
}
