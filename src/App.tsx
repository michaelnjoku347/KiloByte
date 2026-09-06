import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { Assignment, SourceId, ViewMode } from './types'
import { SOURCE_ORDER, SOURCES } from './data/sources'
import { useCalendarStore } from './hooks/useCalendarStore'
import { MonthView } from './components/MonthView'
import { WeekView, AgendaView, DayRail } from './components/WeekAgenda'
import {
  AssignmentModal,
  ImportDrawer,
  draftFromAssignment,
  emptyDraft,
  fromLocalInput,
  type AssignmentDraft,
} from './components/AssignmentModal'
import { formatDue, relativeDue, dueUrgency } from './lib/reminders'
import './App.css'

function App() {
  const store = useCalendarStore()
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => new Date())
  const [activeSources, setActiveSources] = useState<Set<SourceId>>(
    () => new Set(SOURCE_ORDER),
  )
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [draft, setDraft] = useState<AssignmentDraft>(() =>
    emptyDraft(new Date(), store.settings.defaultReminders),
  )
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.assignments.filter((a) => {
      if (!activeSources.has(a.source)) return false
      if (!q) return true
      return (
        a.title.toLowerCase().includes(q) ||
        a.course.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q)
      )
    })
  }, [store.assignments, activeSources, query])

  const upcoming = useMemo(
    () =>
      filtered
        .filter((a) => !a.completed)
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        .slice(0, 8),
    [filtered],
  )

  const toggleSource = (id: SourceId) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return next
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openCreate = (day?: Date | null) => {
    setModalMode('create')
    setEditing(null)
    setDraft(emptyDraft(day ?? selectedDay, store.settings.defaultReminders))
    setModalOpen(true)
  }

  const openEdit = (a: Assignment) => {
    setModalMode('edit')
    setEditing(a)
    setDraft(draftFromAssignment(a))
    setModalOpen(true)
  }

  const saveModal = () => {
    if (!draft.title.trim() || !draft.course.trim() || !draft.dueAtLocal) return
    const payload = {
      title: draft.title.trim(),
      course: draft.course.trim(),
      source: draft.source,
      dueAt: fromLocalInput(draft.dueAtLocal),
      notes: draft.notes.trim(),
      url: draft.url.trim() || undefined,
      reminderOffsets: draft.reminderOffsets,
    }
    if (modalMode === 'create') {
      store.addAssignment(payload)
    } else if (editing) {
      store.updateAssignment(editing.id, payload)
      store.flash('Assignment updated')
    }
    setModalOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />

      <header className="topbar">
        <div className="brand-block">
          <p className="brand">Syllabus</p>
          <p className="brand-tag">Farmingdale · deadlines in one place</p>
        </div>

        <div className="top-actions">
          <label className="search">
            <span className="sr-only">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses or titles"
            />
          </label>
          <button type="button" className="ghost-btn" onClick={() => setImportOpen(true)}>
            Import ICS
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => store.enableNotifications()}
          >
            {store.settings.notificationsEnabled ? 'Reminders on' : 'Enable reminders'}
          </button>
          <button type="button" className="primary-btn" onClick={() => openCreate()}>
            Quick add
          </button>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat">
          <span>Open</span>
          <strong>{store.stats.open}</strong>
        </div>
        <div className="stat warn">
          <span>Overdue</span>
          <strong>{store.stats.overdue}</strong>
        </div>
        <div className="stat">
          <span>Next 7 days</span>
          <strong>{store.stats.week}</strong>
        </div>
        <div className="view-switch" role="tablist" aria-label="Calendar view">
          {(['month', 'week', 'agenda'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              className={view === mode ? 'on' : ''}
              onClick={() => setView(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <section className="panel side-panel">
            <header className="panel-toolbar stacked">
              <h2 className="panel-title">Sources</h2>
              <p className="panel-sub">Filter platforms</p>
            </header>
            <div className="source-list">
              {SOURCE_ORDER.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={`source-row ${activeSources.has(id) ? 'on' : ''}`}
                  onClick={() => toggleSource(id)}
                >
                  <i style={{ background: SOURCES[id].color }} />
                  <span>{SOURCES[id].label}</span>
                  <em>
                    {
                      store.assignments.filter(
                        (a) => a.source === id && !a.completed,
                      ).length
                    }
                  </em>
                </button>
              ))}
            </div>
          </section>

          <section className="panel side-panel">
            <header className="panel-toolbar stacked">
              <h2 className="panel-title">Up next</h2>
              <p className="panel-sub">Sorted by due time</p>
            </header>
            <div className="upcoming-list">
              {upcoming.length === 0 && (
                <p className="empty-slot">You are clear — nice work.</p>
              )}
              {upcoming.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={`upcoming-item urgency-${dueUrgency(a.dueAt, a.completed)}`}
                  onClick={() => openEdit(a)}
                >
                  <div className="upcoming-top">
                    <span
                      className="source-pill"
                      style={{
                        background: SOURCES[a.source].soft,
                        color: SOURCES[a.source].color,
                      }}
                    >
                      {SOURCES[a.source].shortLabel}
                    </span>
                    <time>{relativeDue(a.dueAt)}</time>
                  </div>
                  <strong>{a.title}</strong>
                  <span className="upcoming-meta">
                    {a.course} · {formatDue(a.dueAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel side-panel tips-panel">
            <h2 className="panel-title">How sync works</h2>
            <ol>
              <li>Import Brightspace ICS for auto dates.</li>
              <li>Quick-add Cengage, Zybooks, and VHL.</li>
              <li>Enable browser reminders once.</li>
            </ol>
            <button type="button" className="ghost-btn full" onClick={store.resetDemoData}>
              Restore demo deadlines
            </button>
          </section>
        </aside>

        <main className="main-stage">
          {view === 'month' && (
            <MonthView
              cursor={cursor}
              onCursorChange={setCursor}
              assignments={filtered}
              activeSources={activeSources}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                setSelectedDay(d)
                setCursor(d)
              }}
              onOpenAssignment={openEdit}
            />
          )}
          {view === 'week' && (
            <WeekView
              cursor={cursor}
              onCursorChange={(d) => {
                setCursor(d)
                setSelectedDay(d)
              }}
              assignments={filtered}
              activeSources={activeSources}
              onOpenAssignment={openEdit}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              assignments={filtered}
              activeSources={activeSources}
              onOpenAssignment={openEdit}
            />
          )}
        </main>

        {view === 'month' && selectedDay && (
          <DayRail
            day={selectedDay}
            assignments={filtered}
            onOpenAssignment={openEdit}
            onAdd={openCreate}
          />
        )}
      </div>

      <footer className="footer">
        <span>Syllabus keeps deadlines local in your browser.</span>
        <span>{format(new Date(), 'EEEE, MMM d')}</span>
      </footer>

      {store.toast && <div className="toast" role="status">{store.toast}</div>}

      <AssignmentModal
        open={modalOpen}
        mode={modalMode}
        draft={draft}
        assignment={editing}
        onChange={setDraft}
        onClose={() => setModalOpen(false)}
        onSave={saveModal}
        onDelete={
          editing
            ? () => {
                store.deleteAssignment(editing.id)
                setModalOpen(false)
              }
            : undefined
        }
        onToggleComplete={
          editing
            ? () => {
                store.toggleComplete(editing.id)
                setModalOpen(false)
              }
            : undefined
        }
      />

      <ImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        savedUrl={store.settings.icsUrls.brightspace}
        onImportFile={(text, source, course) =>
          store.importIcsText(text, source, course)
        }
        onImportUrl={(url, source, course) =>
          store.importIcsUrl(url, source, course)
        }
      />
    </div>
  )
}

export default App
