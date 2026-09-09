import type { SiteTheme } from '../types'

export function parseTheme(value: unknown): SiteTheme {
  return value === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: SiteTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#09090b' : '#eef0f5')
}
