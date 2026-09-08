import { useEffect, useMemo, useState } from 'react'
import type { ArcadeSettings, GameSpec } from '../types'
import {
  arcadeWeight,
  loadState,
  publishedCarts,
  saveState,
  upsertCart,
} from '../lib/storage'
import { HOUSE_CARTS } from '../data/house'

export function useArcade() {
  const [carts, setCarts] = useState<GameSpec[]>(() => loadState().carts)
  const [settings, setSettings] = useState<ArcadeSettings>(() => loadState().settings)
  const [toast, setToast] = useState('')

  useEffect(() => {
    saveState({ carts, settings })
  }, [carts, settings])

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  const all = useMemo(() => publishedCarts({ carts, settings }), [carts, settings])

  const publish = (spec: GameSpec) => {
    setCarts((list) => upsertCart(list, spec))
    flash(`Published ${spec.title}`)
  }

  const remove = (id: string) => {
    setCarts((list) => list.filter((c) => c.id !== id))
    flash('Cart pulled from your cabinet')
  }

  const find = (id: string): GameSpec | undefined =>
    all.find((c) => c.id === id) ?? HOUSE_CARTS.find((c) => c.id === id)

  return {
    carts,
    all,
    mine: carts,
    house: HOUSE_CARTS,
    settings,
    setSettings,
    toast,
    flash,
    publish,
    remove,
    find,
    bytes: arcadeWeight(all),
  }
}
