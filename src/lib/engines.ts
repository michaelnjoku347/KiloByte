import type { WebEngine } from '../types'
import type { BundleFile } from './bundle'

export type { WebEngine }

export const ENGINE_LABEL: Record<WebEngine, string> = {
  unity: 'Unity WebGL',
  godot: 'Godot HTML5',
  emscripten: 'Emscripten',
  rust: 'Rust wasm-bindgen',
  go: 'Go wasm',
  bevy: 'Bevy',
  javascript: 'HTML / JavaScript',
}

const BLOCKED = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'ps1',
  'sh',
  'php',
  'asp',
  'aspx',
  'msi',
  'dmg',
  'scr',
  'vbs',
  'jar',
  'so',
  'dylib',
  'apk',
])

const TEXT_EXT = new Set(['html', 'htm', 'js', 'mjs', 'json', 'css', 'txt', 'godot'])

export function assertSafeBundle(files: BundleFile[]): void {
  for (const file of files) {
    const path = file.path.replace(/\\/g, '/')
    if (!path || path.startsWith('/') || path.includes('..') || path.includes('\0')) {
      throw new Error(`Blocked path: ${file.path}`)
    }
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    if (BLOCKED.has(ext)) throw new Error(`Blocked file type: .${ext}`)
  }
}

function textOf(file: BundleFile, limit = 80_000): string {
  const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
  if (!TEXT_EXT.has(ext)) return ''
  const bytes = new Uint8Array(file.data.slice(0, limit))
  return new TextDecoder().decode(bytes)
}

export function detectEngine(files: BundleFile[]): WebEngine {
  const paths = files.map((file) => file.path.toLowerCase())
  const blob = files.map((file) => `${file.path}\n${textOf(file)}`).join('\n').toLowerCase()
  if (blob.includes('createunityinstance') || blob.includes('unityloader') || blob.includes('unity-canvas') || paths.some((p) => p.endsWith('.unityweb'))) {
    return 'unity'
  }
  if (blob.includes('godot') || paths.some((p) => p.endsWith('.pck'))) return 'godot'
  if (blob.includes('bevy_render') || blob.includes('bevy_ecs') || blob.includes('.bevy')) return 'bevy'
  if (blob.includes('wasm_bindgen') || blob.includes('wasm-bindgen')) return 'rust'
  if (paths.some((p) => p.endsWith('wasm_exec.js')) || blob.includes('syscall/js')) return 'go'
  if (blob.includes('emscripten') || paths.some((p) => p.endsWith('.wasm'))) return 'emscripten'
  return 'javascript'
}

export function inspectBundle(files: BundleFile[]): { engine: WebEngine; notes: string[] } {
  assertSafeBundle(files)
  const engine = detectEngine(files)
  const notes = [ENGINE_LABEL[engine]]
  if (!files.some((file) => file.path.toLowerCase().endsWith('.html'))) {
    notes.push('No HTML entry yet')
  }
  if (engine === 'unity') notes.push('Keep the Build folder next to index.html')
  if (engine === 'godot') notes.push('Export with threads off unless the host sends COOP/COEP')
  if (engine === 'go') notes.push('Include wasm_exec.js beside the wasm file')
  return { engine, notes }
}
