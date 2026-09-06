import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import type { Assignment, SourceId } from '../types'
import { SOURCES } from '../data/sources'
import { dueUrgency } from '../lib/reminders'

interface Props {
  cursor: Date
  onCursorChange: (d: Date) => void
  assignments: Assignment[]
  activeSources: Set<SourceId>
  onSelectDay: (d: Date) => void
  onOpenAssignment: (a: Assignment) => void
  selectedDay: Date | null
}

export function MonthView({
  cursor,
  onCursorChange,
  assignments,
  activeSources,
  onSelectDay,
  onOpenAssignment,
  selectedDay,
}: Props) {
  const start = startOfWeek(startOfMonth(cursor))
  const end = endOfWeek(endOfMonth(cursor))
  const days = eachDayOfInterval({ start, end })

  return (
    <section className="panel calendar-panel" aria-label="Month calendar">
      <header className="panel-toolbar">
        <div className="toolbar-left">
          <h2 className="panel-title">{format(cursor, 'MMMM yyyy')}</h2>
          <button type="button" className="ghost-btn" onClick={() => onCursorChange(new Date())}>
            Today
          </button>
        </div>
        <div className="toolbar-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => onCursorChange(subMonths(cursor, 1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next month"
            onClick={() => onCursorChange(addMonths(cursor, 1))}
          >
            ›
          </button>
        </div>
      </header>

      <div className="weekday-row" aria-hidden>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="month-grid">
        {days.map((day) => {
          const dayItems = assignments
            .filter(
              (a) =>
                activeSources.has(a.source) &&
                isSameDay(new Date(a.dueAt), day),
            )
            .sort(
              (a, b) =>
                new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
            )
          const inMonth = isSameMonth(day, cursor)
          const selected = selectedDay && isSameDay(day, selectedDay)

          return (
            <button
              type="button"
              key={day.toISOString()}
              className={[
                'day-cell',
                inMonth ? '' : 'muted',
                isToday(day) ? 'today' : '',
                selected ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDay(day)}
            >
              <span className="day-num">{format(day, 'd')}</span>
              <div className="day-events">
                {dayItems.slice(0, 3).map((a) => {
                  const urgency = dueUrgency(a.dueAt, a.completed)
                  return (
                    <span
                      key={a.id}
                      className={`event-chip urgency-${urgency}`}
                      style={{
                        background: SOURCES[a.source].soft,
                        color: SOURCES[a.source].color,
                      }}
                      title={a.title}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenAssignment(a)
                      }}
                    >
                      <i
                        className="dot"
                        style={{ background: SOURCES[a.source].color }}
                      />
                      {a.title}
                    </span>
                  )
                })}
                {dayItems.length > 3 && (
                  <span className="more-chip">+{dayItems.length - 3} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
