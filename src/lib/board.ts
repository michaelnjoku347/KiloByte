const KEY = 'kilobyte.cinder.scores.v1'

export type ScoreRow = { name: string; score: number; at: number }

export function readScores(raw: string | null): ScoreRow[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((row): row is ScoreRow => {
        if (!row || typeof row !== 'object') return false
        const item = row as ScoreRow
        return typeof item.name === 'string' && typeof item.score === 'number'
      })
      .slice(0, 8)
  } catch {
    return []
  }
}

export function rememberScore(name: string, score: number, raw: string | null, now = Date.now()): ScoreRow[] {
  const next = [...readScores(raw), { name, score, at: now }].sort((a, b) => b.score - a.score).slice(0, 8)
  return next
}

export function loadScores(): ScoreRow[] {
  if (typeof localStorage === 'undefined') return []
  return readScores(localStorage.getItem(KEY))
}

export function saveScore(name: string, score: number): ScoreRow[] {
  const next = rememberScore(name, score, typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY))
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
