export type CloudConfig = { url: string; anonKey: string }

export function readCloudConfig(env: Record<string, string | undefined> = import.meta.env): CloudConfig | null {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url.startsWith('https://') || anonKey.length < 20) return null
  if (anonKey.includes('service_role')) return null
  return { url, anonKey }
}

export type CloudClient = {
  auth: {
    signUp: (args: { email: string; password: string }) => Promise<{ error: { message: string } | null }>
    signInWithPassword: (args: { email: string; password: string }) => Promise<{ error: { message: string } | null }>
    signOut: () => Promise<unknown>
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>
  }
  from: (table: string) => {
    insert: (row: unknown) => Promise<{ error: { message: string } | null }>
    upsert: (row: unknown) => Promise<{ error: { message: string } | null }>
  }
  channel: (name: string, opts?: { config?: { broadcast?: { self?: boolean } } }) => RealtimeChannel
  functions: {
    invoke: (name: string, args: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }>
  }
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: ArrayBuffer, opts: { contentType: string; upsert: boolean }) => Promise<{ error: { message: string } | null }>
    }
  }
}

type RealtimeChannel = {
  on: (type: 'broadcast', filter: { event: string }, cb: (payload: { payload: unknown }) => void) => RealtimeChannel
  subscribe: (cb?: (status: string) => void) => RealtimeChannel
  send: (message: { type: 'broadcast'; event: string; payload: unknown }) => Promise<unknown>
}

let clientPromise: Promise<CloudClient> | null = null

export function cloudClient(config = readCloudConfig()): Promise<CloudClient> | null {
  if (!config) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      return createClient(config.url, config.anonKey) as unknown as CloudClient
    })
  }
  return clientPromise
}

export async function callStudio(body: unknown): Promise<unknown> {
  const pending = cloudClient()
  if (!pending) throw new Error('Studio AI needs a free Supabase project. Nothing was sent.')
  const client = await pending
  const { data, error } = await client.functions.invoke('studio', { body })
  if (error) throw new Error(error.message)
  return data
}
