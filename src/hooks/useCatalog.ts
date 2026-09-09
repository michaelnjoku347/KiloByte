import { useEffect, useMemo, useState } from 'react'
import type { ArcadeSettings, GameRecord, GameSpec, SiteTheme, UserProfile } from '../types'
import {
  DEFAULT_SETTINGS,
  loadState,
  localWeight,
  publishedGames,
  saveState,
  upsertGame,
} from '../lib/storage'
import { recordFromCart } from '../lib/record'
import { deleteBundle, saveBundle } from '../lib/idb'
import type { BundleFile } from '../lib/bundle'
import { bundleBytes, bundleToRecord } from '../lib/bundle'
import {
  checkPassphrase,
  hasPassphrase,
  makeProfile,
  parseBio,
  parseDisplayName,
  sealPassphrase,
} from '../lib/profile'
import { applyTheme, parseTheme } from '../lib/theme'

export function useCatalog() {
  const initial = loadState()
  const [games, setGames] = useState<GameRecord[]>(() => initial.games)
  const [settings, setSettings] = useState<ArcadeSettings>(() => initial.settings)
  const [plays, setPlays] = useState<Record<string, number>>(() => initial.plays)
  const [recents, setRecents] = useState<string[]>(() => initial.recents)
  const [favorites, setFavorites] = useState<string[]>(() => initial.favorites)
  const [ratings, setRatings] = useState<Record<string, number>>(() => initial.ratings)
  const [profile, setProfile] = useState<UserProfile | null>(() => initial.profile)
  const [signedIn, setSignedIn] = useState(() => initial.signedIn)
  const [toast, setToast] = useState('')

  useEffect(() => {
    saveState({ games, settings, plays, recents, favorites, ratings, profile, signedIn })
  }, [games, settings, plays, recents, favorites, ratings, profile, signedIn])

  useEffect(() => {
    applyTheme(parseTheme(settings.theme))
  }, [settings.theme])

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const all = useMemo(
    () => publishedGames({ games, settings, plays, recents, favorites, ratings, profile, signedIn }),
    [games, settings, plays, recents, favorites, ratings, profile, signedIn],
  )
  const mineIds = useMemo(() => new Set(games.map((g) => g.id)), [games])

  const publish = async (game: GameRecord, files?: BundleFile[]) => {
    if (files?.length) await saveBundle(game.id, bundleToRecord(files))
    setGames((list) => upsertGame(list, files ? { ...game, bytes: bundleBytes(files) } : game))
    flash(`Published ${game.title}`)
  }

  const publishCart = (spec: GameSpec) => {
    const record = recordFromCart({ ...spec, house: false })
    setGames((list) => upsertGame(list, record))
    flash(`Published ${spec.title}`)
  }

  const remove = async (id: string) => {
    setGames((list) => list.filter((g) => g.id !== id))
    setRecents((list) => list.filter((x) => x !== id))
    setFavorites((list) => list.filter((x) => x !== id))
    setRatings((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    await deleteBundle(id).catch(() => undefined)
    flash('Removed from the catalog')
  }

  const bumpPlays = (id: string) => {
    setPlays((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
    setRecents((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12))
  }

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const rate = (id: string, stars: number) => {
    const n = Math.round(stars)
    if (n < 1 || n > 5) return
    setRatings((prev) => ({ ...prev, [id]: n }))
    setGames((list) => list.map((game) => (game.id === id ? { ...game, rating: n } : game)))
  }

  const find = (id: string) => all.find((g) => g.id === id)

  const signUp = async (input: {
    displayName: string
    handle: string
    bio?: string
    passphrase?: string
  }) => {
    const next = await makeProfile(input)
    setProfile(next)
    setSignedIn(true)
    setSettings((prev) => ({ ...prev, author: next.displayName }))
    flash(`Card made for @${next.handle}`)
  }

  const signIn = async (passphrase?: string) => {
    if (!profile) throw new Error('No card on this device yet.')
    if (hasPassphrase(profile)) {
      const ok = await checkPassphrase(passphrase ?? '', profile.salt ?? '', profile.hash ?? '')
      if (!ok) throw new Error('That passphrase does not match.')
    }
    setSignedIn(true)
    setSettings((prev) => ({ ...prev, author: profile.displayName }))
    flash(`Signed in as @${profile.handle}`)
  }

  const signOut = () => {
    setSignedIn(false)
    setSettings((prev) => ({ ...prev, author: DEFAULT_SETTINGS.author }))
    flash('Playing as a guest')
  }

  const updateProfile = async (patch: { displayName?: string; bio?: string; passphrase?: string }) => {
    if (!profile) throw new Error('No card on this device yet.')
    const next: UserProfile = {
      ...profile,
      displayName: patch.displayName !== undefined ? parseDisplayName(patch.displayName) : profile.displayName,
      bio: patch.bio !== undefined ? parseBio(patch.bio) : profile.bio,
    }
    const phrase = patch.passphrase?.trim()
    if (phrase) {
      const sealed = await sealPassphrase(phrase)
      next.salt = sealed.salt
      next.hash = sealed.hash
    }
    setProfile(next)
    setSettings((prev) => ({ ...prev, author: next.displayName }))
    flash('Card updated')
  }

  const removeProfile = () => {
    setProfile(null)
    setSignedIn(false)
    setSettings((prev) => ({ ...prev, author: DEFAULT_SETTINGS.author }))
    flash('Card removed from this browser')
  }

  const setTheme = (theme: SiteTheme) => {
    setSettings((prev) => ({ ...prev, theme }))
  }

  return {
    all,
    mine: games,
    mineIds,
    settings,
    setSettings,
    plays,
    recents,
    favorites,
    ratings,
    profile,
    signedIn,
    toast,
    flash,
    publish,
    publishCart,
    remove,
    bumpPlays,
    toggleFavorite,
    rate,
    find,
    signUp,
    signIn,
    signOut,
    updateProfile,
    removeProfile,
    setTheme,
    bytes: localWeight(all),
  }
}
