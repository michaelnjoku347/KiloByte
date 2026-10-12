import { describe, expect, it } from 'vitest'
import { allowAction } from './limits'
import { readCloudConfig } from './cloud'

describe('free-tier gates', () => {
  it('ignores a missing or unsafe Supabase config', () => {
    expect(readCloudConfig({})).toBeNull()
    expect(readCloudConfig({ VITE_SUPABASE_URL: 'http://insecure.example', VITE_SUPABASE_ANON_KEY: 'x'.repeat(30) })).toBeNull()
    expect(readCloudConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'service_role-secret-value-here' })).toBeNull()
    expect(readCloudConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'a'.repeat(30) })?.url).toBe(
      'https://example.supabase.co',
    )
  })

  it('spaces uploads', () => {
    expect(allowAction(1_000, 0)).toEqual({ ok: false, waitMs: 7_000 })
    expect(allowAction(8_000, 0).ok).toBe(true)
  })
})
