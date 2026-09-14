import type { PointerEvent } from 'react'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function trackPointer(e: PointerEvent<HTMLElement>) {
  if (reducedMotion()) return
  const box = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - box.left) / Math.max(box.width, 1)
  const y = (e.clientY - box.top) / Math.max(box.height, 1)
  e.currentTarget.style.setProperty('--px', (x * 2 - 1).toFixed(3))
  e.currentTarget.style.setProperty('--py', (y * 2 - 1).toFixed(3))
}

export function resetPointer(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--px', '0')
  e.currentTarget.style.setProperty('--py', '0')
}

export const livePointer = {
  onPointerMove: trackPointer,
  onPointerLeave: resetPointer,
}
