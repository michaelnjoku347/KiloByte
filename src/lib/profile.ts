import type { UserProfile } from '../types'

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 24)
}

export function parseHandle(raw: string): string {
  const handle = normalizeHandle(raw)
  if (handle.length < 3) throw new Error('Handle needs at least 3 letters or numbers.')
  return handle
}

export function parseDisplayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('Add a name people will see on your games.')
  if (name.length > 40) throw new Error('Name is too long.')
  return name
}

export function parseBio(raw: string): string {
  return raw.trim().slice(0, 280)
}

export function initialsFrom(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return trimmed.slice(0, 1).toUpperCase()
}

export function hasPassphrase(profile: UserProfile | null): boolean {
  return Boolean(profile?.hash && profile.salt)
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function derive(passphrase: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations: 40_000 },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export async function sealPassphrase(passphrase: string): Promise<{ salt: string; hash: string }> {
  const secret = passphrase.trim()
  if (secret.length < 6) throw new Error('Passphrase needs at least 6 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toHex(salt), hash: await derive(secret, salt) }
}

export async function checkPassphrase(
  passphrase: string,
  salt: string,
  hash: string,
): Promise<boolean> {
  if (!salt || !hash) return false
  const next = await derive(passphrase.trim(), fromHex(salt))
  return next === hash
}

export async function makeProfile(input: {
  displayName: string
  handle: string
  bio?: string
  passphrase?: string
  githubLogin?: string
}): Promise<UserProfile> {
  const profile: UserProfile = {
    handle: parseHandle(input.handle),
    displayName: parseDisplayName(input.displayName),
    bio: parseBio(input.bio ?? ''),
    createdAt: new Date().toISOString(),
    githubLogin: input.githubLogin?.trim() || undefined,
  }
  const phrase = input.passphrase?.trim()
  if (phrase) {
    const sealed = await sealPassphrase(phrase)
    profile.salt = sealed.salt
    profile.hash = sealed.hash
  }
  return profile
}
