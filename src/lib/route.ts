import type { Route } from '../types'

export function parseHash(hash: string): Route {
  const trimmed = hash.replace(/^#/, '')
  const parts = trimmed.split('/').filter(Boolean)
  const head = parts[0]
  if (head === 'studio') return { name: 'studio' }
  if (head === 'why') return { name: 'why' }
  if (head === 'play' && parts[1]) return { name: 'play', id: parts[1] }
  if (head === 'c' && parts[1]) return { name: 'share', payload: parts.slice(1).join('/') }
  return { name: 'arcade' }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'studio':
      return '#/studio'
    case 'why':
      return '#/why'
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
