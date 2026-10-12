const GAP_MS = 8_000

export function allowAction(now: number, last: number, gap = GAP_MS): { ok: boolean; waitMs: number } {
  const waitMs = Math.max(0, gap - (now - last))
  return { ok: waitMs === 0, waitMs }
}
