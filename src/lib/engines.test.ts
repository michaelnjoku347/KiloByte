import { describe, expect, it } from 'vitest'
import type { BundleFile } from './bundle'
import { detectEngine, inspectBundle } from './engines'

function file(path: string, text: string): BundleFile {
  const bytes = new TextEncoder().encode(text)
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return { path, type: 'text/plain', data }
}

describe('web export detection', () => {
  it('names Unity, Godot, Rust, Go, Bevy, Emscripten, and plain JS', () => {
    expect(detectEngine([file('index.html', '<canvas id="unity-canvas">'), file('Build/game.loader.js', 'createUnityInstance')])).toBe('unity')
    expect(detectEngine([file('index.html', '<script src="index.js">'), file('index.pck', '')])).toBe('godot')
    expect(detectEngine([file('index.html', 'ok'), file('game.js', 'wasm_bindgen')])).toBe('rust')
    expect(detectEngine([file('index.html', 'ok'), file('wasm_exec.js', 'syscall/js')])).toBe('go')
    expect(detectEngine([file('index.html', 'ok'), file('game.js', 'bevy_render')])).toBe('bevy')
    expect(detectEngine([file('index.html', 'var Module'), file('index.wasm', '')])).toBe('emscripten')
    expect(detectEngine([file('index.html', '<canvas id="game">')])).toBe('javascript')
  })

  it('rejects executables and path traversal', () => {
    expect(() => inspectBundle([file('../index.html', 'nope')])).toThrow(/Blocked path/)
    expect(() => inspectBundle([file('game.exe', 'MZ')])).toThrow(/Blocked file type/)
    const ok = inspectBundle([file('index.html', '<canvas>'), file('app.js', 'start()')])
    expect(ok.engine).toBe('javascript')
  })
})
