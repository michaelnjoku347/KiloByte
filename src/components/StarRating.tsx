import type { CSSProperties } from 'react'
import { clampRating, formatRating } from '../lib/catalog'

export function StarRating({
  value,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  value: number
  size?: 'sm' | 'md'
  interactive?: boolean
  onChange?: (n: number) => void
}) {
  const v = clampRating(value)
  const label = v > 0 ? `${formatRating(v)} out of 5` : 'Not rated yet'

  return (
    <span
      className={`stars stars-${size}${interactive ? ' stars-live' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, v - (n - 1)))
        const glyph = (
          <span className="star" aria-hidden>
            <span className="star-empty">★</span>
            <span className="star-fill" style={{ '--fill': `${fill * 100}%` } as CSSProperties}>
              ★
            </span>
          </span>
        )
        if (!interactive) {
          return (
            <span key={n} className="star-wrap">
              {glyph}
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            className={`star-hit${v >= n ? ' on' : ''}`}
            role="radio"
            aria-checked={Math.round(v) === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange?.(n)}
          >
            {glyph}
          </button>
        )
      })}
      <span className="star-num">{formatRating(v)}</span>
    </span>
  )
}
