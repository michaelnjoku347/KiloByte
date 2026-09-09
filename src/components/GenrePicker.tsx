import { GENRE_CATALOG, toggleGenre } from '../lib/genres'

export function GenrePicker({
  value,
  onChange,
  extra = [],
}: {
  value: string[]
  onChange: (next: string[]) => void
  extra?: string[]
}) {
  const catalog: string[] = [...GENRE_CATALOG]
  for (const g of extra) {
    if (!catalog.some((c) => c.toLowerCase() === g.toLowerCase())) catalog.push(g)
  }

  return (
    <div className="genre-picker">
      <div className="prompt-row">
        {catalog.map((genre) => {
          const on = value.some((g) => g.toLowerCase() === genre.toLowerCase())
          return (
            <button
              key={genre}
              type="button"
              className={`chip ${on ? 'chip-on' : ''}`}
              onClick={() => onChange(toggleGenre(value, genre))}
            >
              {genre}
            </button>
          )
        })}
      </div>
      <label className="field">
        <span>Add any other genre</span>
        <input
          placeholder="Roguelike, Visual novel, Farming…"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const next = e.currentTarget.value
            e.currentTarget.value = ''
            onChange(toggleGenre(value, next))
          }}
        />
      </label>
    </div>
  )
}
