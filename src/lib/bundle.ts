import { unzipSync } from 'fflate'

export type BundleFile = {
  path: string
  type: string
  data: ArrayBuffer
}

export const MAX_BUNDLE_BYTES = 25 * 1024 * 1024

const MIME: Record<string, string> = {
  html: 'text/html;charset=utf-8',
  htm: 'text/html;charset=utf-8',
  js: 'text/javascript',
  mjs: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wasm: 'application/wasm',
  txt: 'text/plain',
  ico: 'image/x-icon',
}

export function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.?\//, '')
}

function stripRoot(paths: string[]): (p: string) => string {
  if (paths.length === 0) return (p) => p
  const first = paths[0].split('/')[0]
  const common = paths.every((p) => p === first || p.startsWith(`${first}/`))
  if (common && paths.some((p) => p.includes('/'))) {
    return (p) => (p === first ? '' : p.slice(first.length + 1))
  }
  return (p) => p
}

export function findEntry(paths: string[]): string {
  const files = paths.filter(Boolean)
  const index = files.find((p) => p.toLowerCase() === 'index.html')
  if (index) return index
  const nested = files.find((p) => p.toLowerCase().endsWith('/index.html'))
  if (nested) return nested
  const html = files.find((p) => p.toLowerCase().endsWith('.html'))
  if (html) return html
  throw new Error('Upload needs an index.html (or any .html) entry file.')
}

export async function filesFromZip(buffer: ArrayBuffer): Promise<BundleFile[]> {
  const unzipped = unzipSync(new Uint8Array(buffer))
  const rawPaths = Object.keys(unzipped).filter((p) => !p.endsWith('/') && !p.split('/').some((s) => s.startsWith('.')))
  const strip = stripRoot(rawPaths)
  const files: BundleFile[] = []
  let total = 0
  for (const raw of rawPaths) {
    const path = normalizePath(strip(raw))
    if (!path) continue
    const bytes = unzipped[raw]
    total += bytes.byteLength
    if (total > MAX_BUNDLE_BYTES) throw new Error('Bundle is over 25 MB.')
    const copy = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(copy).set(bytes)
    files.push({ path, type: mimeFor(path), data: copy })
  }
  return files
}

export async function filesFromList(list: File[]): Promise<BundleFile[]> {
  if (list.length === 1 && list[0].name.toLowerCase().endsWith('.zip')) {
    return filesFromZip(await list[0].arrayBuffer())
  }
  const withPaths = list.map((file) => {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    return { file, path: normalizePath(rel && rel.length > 0 ? rel : file.name) }
  })
  const strip = stripRoot(withPaths.map((f) => f.path))
  const files: BundleFile[] = []
  let total = 0
  for (const item of withPaths) {
    const path = normalizePath(strip(item.path))
    if (!path) continue
    total += item.file.size
    if (total > MAX_BUNDLE_BYTES) throw new Error('Bundle is over 25 MB.')
    files.push({ path, type: item.file.type || mimeFor(path), data: await item.file.arrayBuffer() })
  }
  return files
}

export function bundleBytes(files: BundleFile[]): number {
  return files.reduce((sum, f) => sum + f.data.byteLength, 0)
}

export function bundleToRecord(files: BundleFile[]): Record<string, { type: string; data: ArrayBuffer }> {
  const out: Record<string, { type: string; data: ArrayBuffer }> = {}
  for (const file of files) out[file.path] = { type: file.type, data: file.data }
  return out
}
