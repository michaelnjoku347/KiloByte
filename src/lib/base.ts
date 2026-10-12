/** Prefix a public-folder path with Vite's base so GitHub Pages and portfolio subpaths both work. */
export function publicUrl(path: string): string {
  const clean = path.replace(/^\/+/, '')
  const raw = import.meta.env?.BASE_URL ?? '/'
  if (raw === './' || raw === '.') return `./${clean}`
  const prefix = raw.endsWith('/') ? raw : `${raw}/`
  return `${prefix}${clean}`
}
