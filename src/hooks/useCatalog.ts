import { useEffect, useMemo, useState } from 'react'
import type { ArcadeSettings, GameRecord, GameSpec } from '../types'
import { loadState, localWeight, publishedGames, saveState, upsertGame } from '../lib/storage'
import { recordFromCart } from '../lib/record'
import { deleteBundle, saveBundle } from '../lib/idb'
import type { BundleFile } from '../lib/bundle'
import { bundleBytes, bundleToRecord } from '../lib/bundle'

export function useCatalog() {
  const initial = loadState()
  const [games, setGames] = useState<GameRecord[]>(() => initial.games)
  const [settings, setSettings] = useState<ArcadeSettings>(() => initial.settings)
  const [plays, setPlays] = useState<Record<string, number>>(() => initial.plays)
  const [recents, setRecents] = useState<string[]>(() => initial.recents)
  const [favorites, setFavorites] = useState<string[]>(() => initial.favorites)
  const [toast, setToast] = useState('')

  useEffect(() => {
    saveState({ games, settings, plays, recents, favorites })
  }, [games, settings, plays, recents, favorites])

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const all = useMemo(
    () => publishedGames({ games, settings, plays, recents, favorites }),
    [games, settings, plays, recents, favorites],
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

  const find = (id: string) => all.find((g) => g.id === id)

  return {
    all,
    mine: games,
    mineIds,
    settings,
    setSettings,
    plays,
    recents,
    favorites,
    toast,
    flash,
    publish,
    publishCart,
    remove,
    bumpPlays,
    toggleFavorite,
    find,
    bytes: localWeight(all),
  }
}
