import { useEffect, useMemo, useState } from 'react'
import type { ArcadeSettings, GameRecord, GameSpec } from '../types'
import { loadState, localWeight, publishedGames, saveState, upsertGame } from '../lib/storage'
import { recordFromCart } from '../lib/record'
import { deleteBundle, saveBundle } from '../lib/idb'
import type { BundleFile } from '../lib/bundle'
import { bundleBytes, bundleToRecord } from '../lib/bundle'

export function useCatalog() {
  const [games, setGames] = useState<GameRecord[]>(() => loadState().games)
  const [settings, setSettings] = useState<ArcadeSettings>(() => loadState().settings)
  const [plays, setPlays] = useState<Record<string, number>>(() => loadState().plays)
  const [toast, setToast] = useState('')

  useEffect(() => {
    saveState({ games, settings, plays })
  }, [games, settings, plays])

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const all = useMemo(() => publishedGames({ games, settings, plays }), [games, settings, plays])
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
    await deleteBundle(id).catch(() => undefined)
    flash('Removed from your cabinet')
  }

  const bumpPlays = (id: string) => {
    setPlays((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const find = (id: string) => all.find((g) => g.id === id)

  return {
    all,
    mine: games,
    mineIds,
    settings,
    setSettings,
    plays,
    toast,
    flash,
    publish,
    publishCart,
    remove,
    bumpPlays,
    find,
    bytes: localWeight(all),
  }
}
