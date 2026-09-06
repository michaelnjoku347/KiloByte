import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type { Assignment, SourceId } from '../types'
import { SOURCES } from '../data/sources'
import { dueUrgency, formatDue } from '../lib/reminders'

interface Props {
  cursor: Date
  onCursorChange: (d: Date) => void
  assignments: Assignment[]
  activeSources: Set<SourceId>
  onOpenAssignment: (a: Assignment) => void
}

export function WeekView({
  cursor,
  onCursorChange,
  assignments,
  activeSources,
  onOpenAssignment,
}: Props) {
  const start = startOfWeek(cursor)
  const end = endOfWeek(cursor)
  const days = eachDayOfInterval({ start, end })

  return (
    <section className="panel calendar-panel" aria-label="Week calendar">
      <header className="panel-toolbar">
        <div className="toolbar-left">
          <h2 className="panel-title">
            {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
          </h2>
          <button type="button" className="ghost-btn" onClick={() => onCursorChange(new Date())}>
            Today
          </button>
        </div>
        <div className="toolbar-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous week"
            onClick={() => onCursorChange(subWeeks(cursor, 1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next week"
            onClick={() => onCursorChange(addWeeks(cursor, 1))}
          >
            ›
          </button>
        </div>
      </header>

      <div className="week-grid">
        {days.map((day) => {
          const items = assignments
            .filter(
              (a) =>
                activeSources.has(a.source) &&
                isSameDay(new Date(a.dueAt), day),
            )
            .sort(
              (a, b) =>
                new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
            )

          return (
            <div
              key={day.toISOString()}
              className={`week-col ${isToday(day) ? 'today' : ''}`}
            >
              <div className="week-col-head">
                <span className="week-dow">{format(day, 'EEE')}</span>
                <span className="week-dom">{format(day, 'd')}</span>
              </div>
              <div className="week-col-body">
                {items.length === 0 && (
                  <p className="empty-slot">Clear</p>
                )}
                {items.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className={`week-item urgency-${dueUrgency(a.dueAt, a.completed)}`}
                    style={{ borderLeftColor: SOURCES[a.source].color }}
                    onClick={() => onOpenAssignment(a)}
                  >
                    <span className="week-item-time">
                      {format(new Date(a.dueAt), 'h:mm a')}
                    </span>
                    <span className="week-item-title">{a.title}</span>
                    <span className="week-item-meta">
                      {SOURCES[a.source].shortLabel} · {a.course}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function AgendaView({
  assignments,
  activeSources,
  onOpenAssignment,
}: {
  assignments: Assignment[]
  activeSources: Set<SourceId>
  onOpenAssignment: (a: Assignment) => void
}) {
  const items = assignments
    .filter((a) => activeSources.has(a.source) && !a.completed)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())

  const groups = new Map<string, Assignment[]>()
  for (const a of items) {
    const key = format(new Date(a.dueAt), 'yyyy-MM-dd')
    const list = groups.get(key) ?? []
    list.push(a)
    groups.set(key, list)
  }

  return (
    <section className="panel calendar-panel agenda-panel" aria-label="Agenda">
      <header className="panel-toolbar">
        <h2 className="panel-title">Upcoming agenda</h2>
        <p className="panel-sub">{items.length} open deadlines</p>
      </header>

      <div className="agenda-list">
        {items.length === 0 && (
          <div className="empty-state">
            <p>No open deadlines for the selected sources.</p>
          </div>
        )}
        {[...groups.entries()].map(([key, dayItems]) => {
          const day = new Date(key + 'T12:00:00')
          return (
            <div key={key} className="agenda-group">
              <h3 className="agenda-day">
                {format(day, 'EEEE, MMMM d')}
              </h3>
              {dayItems.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={`agenda-row urgency-${dueUrgency(a.dueAt, a.completed)}`}
                  onClick={() => onOpenAssignment(a)}
                >
                  <span
                    className="source-pill"
                    style={{
                      background: SOURCES[a.source].soft,
                      color: SOURCES[a.source].color,
                    }}
                  >
                    {SOURCES[a.source].shortLabel}
                  </span>
                  <div className="agenda-copy">
                    <strong>{a.title}</strong>
                    <span>{a.course}</span>
                  </div>
                  <time dateTime={a.dueAt}>{formatDue(a.dueAt)}</time>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function DayRail({
  day,
  assignments,
  onOpenAssignment,
  onAdd,
}: {
  day: Date
  assignments: Assignment[]
  onOpenAssignment: (a: Assignment) => void
  onAdd: (day: Date) => void
}) {
  const items = assignments
    .filter((a) => isSameDay(new Date(a.dueAt), day))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())

  return (
    <aside className="panel day-rail" aria-label="Selected day">
      <header className="panel-toolbar stacked">
        <div>
          <p className="eyebrow">{format(day, 'EEEE')}</p>
          <h2 className="panel-title">{format(day, 'MMMM d')}</h2>
        </div>
        <button type="button" className="primary-btn compact" onClick={() => onAdd(day)}>
          Add due
        </button>
      </header>
      <div className="day-rail-list">
        {items.length === 0 && (
          <p className="empty-slot">Nothing due — breathe.</p>
        )}
        {items.map((a) => (
          <button
            type="button"
            key={a.id}
            className="day-rail-item"
            onClick={() => onOpenAssignment(a)}
          >
            <i style={{ background: SOURCES[a.source].color }} />
            <div>
              <strong className={a.completed ? 'strike' : ''}>{a.title}</strong>
              <span>
                {format(new Date(a.dueAt), 'h:mm a')} · {SOURCES[a.source].shortLabel}
              </span>
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ghost-btn full"
        onClick={() => onAdd(addDays(day, 0))}
      >
        + Schedule for this day
      </button>
    </aside>
  )
}
