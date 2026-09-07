import { useEffect, useId, useState } from 'react'
import { format } from 'date-fns'
import type { Assignment, ReminderOffset, SourceId } from '../types'
import { REMINDER_OPTIONS, SOURCE_ORDER, SOURCES } from '../data/sources'

export type AssignmentDraft = {
  title: string
  course: string
  source: SourceId
  dueAtLocal: string
  notes: string
  url: string
  reminderOffsets: ReminderOffset[]
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString()
}

export function emptyDraft(day?: Date | null, defaults?: ReminderOffset[]): AssignmentDraft {
  const base = day ? new Date(day) : new Date()
  base.setHours(23, 59, 0, 0)
  return {
    title: '',
    course: '',
    source: 'brightspace',
    dueAtLocal: toLocalInput(base.toISOString()),
    notes: '',
    url: '',
    reminderOffsets: defaults ?? [1440, 60],
  }
}

export function draftFromAssignment(a: Assignment): AssignmentDraft {
  return {
    title: a.title,
    course: a.course,
    source: a.source,
    dueAtLocal: toLocalInput(a.dueAt),
    notes: a.notes.replace(/\s*\|\s*ics:[^\s|]+/g, '').trim(),
    url: a.url ?? '',
    reminderOffsets: a.reminderOffsets,
  }
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  draft: AssignmentDraft
  assignment?: Assignment | null
  onChange: (draft: AssignmentDraft) => void
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  onToggleComplete?: () => void
}

export function AssignmentModal({
  open,
  mode,
  draft,
  assignment,
  onChange,
  onClose,
  onSave,
  onDelete,
  onToggleComplete,
}: Props) {
  const titleId = useId()
  if (!open) return null

  const toggleReminder = (value: ReminderOffset) => {
    const has = draft.reminderOffsets.includes(value)
    onChange({
      ...draft,
      reminderOffsets: has
        ? draft.reminderOffsets.filter((r) => r !== value)
        : [...draft.reminderOffsets, value].sort((a, b) => b - a),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'New deadline' : 'Edit deadline'}</p>
            <h2 id={titleId}>{mode === 'create' ? 'Add assignment' : draft.title || 'Assignment'}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <label>
            Title
            <input
              required
              value={draft.title}
              placeholder="e.g. Module 4 quiz"
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
            />
          </label>

          <div className="form-row">
            <label>
              Course
              <input
                required
                value={draft.course}
                placeholder="BCS 213"
                onChange={(e) => onChange({ ...draft, course: e.target.value })}
              />
            </label>
            <label>
              Due
              <input
                required
                type="datetime-local"
                value={draft.dueAtLocal}
                onChange={(e) => onChange({ ...draft, dueAtLocal: e.target.value })}
              />
            </label>
          </div>

          <fieldset className="source-fieldset">
            <legend>Platform</legend>
            <div className="source-choices">
              {SOURCE_ORDER.map((id) => (
                <label key={id} className={`source-choice ${draft.source === id ? 'on' : ''}`}>
                  <input
                    type="radio"
                    name="source"
                    checked={draft.source === id}
                    onChange={() => onChange({ ...draft, source: id })}
                  />
                  <span style={{ color: SOURCES[id].color }}>{SOURCES[id].shortLabel}</span>
                </label>
              ))}
            </div>
            <p className="hint">{SOURCES[draft.source].tip}</p>
          </fieldset>

          <label>
            Link (optional)
            <input
              type="url"
              value={draft.url}
              placeholder="https://..."
              onChange={(e) => onChange({ ...draft, url: e.target.value })}
            />
          </label>

          <label>
            Notes
            <textarea
              rows={3}
              value={draft.notes}
              placeholder="Submission details, attempt limits, etc."
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            />
          </label>

          <fieldset className="reminder-fieldset">
            <legend>Reminders</legend>
            <div className="reminder-choices">
              {REMINDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="check-chip">
                  <input
                    type="checkbox"
                    checked={draft.reminderOffsets.includes(opt.value)}
                    onChange={() => toggleReminder(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="modal-actions">
            {mode === 'edit' && onDelete && (
              <button type="button" className="danger-btn" onClick={onDelete}>
                Delete
              </button>
            )}
            {mode === 'edit' && onToggleComplete && assignment && (
              <button type="button" className="ghost-btn" onClick={onToggleComplete}>
                {assignment.completed ? 'Mark open' : 'Mark done'}
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ImportDrawer({
  open,
  onClose,
  onImportFile,
  onImportUrl,
  onImportBackup,
  onExportIcs,
  onExportBackup,
  savedUrl,
}: {
  open: boolean
  onClose: () => void
  onImportFile: (text: string, source: SourceId, course: string) => void
  onImportUrl: (url: string, source: SourceId, course: string) => Promise<unknown>
  onImportBackup: (text: string) => void
  onExportIcs: () => void
  onExportBackup: () => void
  savedUrl?: string
}) {
  const [source, setSource] = useState<SourceId>('brightspace')
  const [course, setCourse] = useState('Brightspace')
  const [url, setUrl] = useState(savedUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false)

  useEffect(() => {
    if (open) {
      setUrl(savedUrl ?? '')
      setError(null)
      setShowAdvancedUrl(false)
    }
  }, [open, savedUrl])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal import-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">Sync</p>
            <h2>Import & export</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-form">
          <div className="sync-tip">
            <strong>Phone reminders</strong>
            <p>
              Browser notifications only work while this tab is open. Export an ICS file and
              import it into Google Calendar or Apple Calendar for alerts on your phone.
            </p>
            <div className="modal-actions" style={{ marginTop: '0.65rem' }}>
              <button type="button" className="primary-btn" onClick={onExportIcs}>
                Export ICS for Google/Apple
              </button>
              <button type="button" className="ghost-btn" onClick={onExportBackup}>
                Backup JSON
              </button>
            </div>
          </div>

          <p className="lead">
            Brightspace: download a <code>.ics</code> from Calendar, then upload it below.
            Pasting a feed URL usually fails in the browser because of CORS. Cengage, Zybooks,
            and VHL Central need Quick Add.
          </p>

          <label>
            Target source
            <select value={source} onChange={(e) => setSource(e.target.value as SourceId)}>
              {SOURCE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {SOURCES[id].label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Course label
            <input value={course} onChange={(e) => setCourse(e.target.value)} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <label className="primary-btn file-btn">
              Upload Brightspace .ics
              <input
                type="file"
                accept=".ics,text/calendar"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  onImportFile(text, source, course)
                  onClose()
                }}
              />
            </label>
            <label className="ghost-btn file-btn">
              Restore backup JSON
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    onImportBackup(text)
                    onClose()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Backup restore failed')
                  }
                }}
              />
            </label>
          </div>

          <button
            type="button"
            className="ghost-btn full"
            onClick={() => setShowAdvancedUrl((v) => !v)}
          >
            {showAdvancedUrl ? 'Hide URL import' : 'Advanced: try ICS URL (often blocked)'}
          </button>

          {showAdvancedUrl && (
            <>
              <label>
                ICS feed URL
                <input
                  type="url"
                  value={url}
                  placeholder="https://brightspace.farmingdale.edu/..."
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <div className="spacer" />
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={!url || busy}
                  onClick={async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      await onImportUrl(url, source, course)
                      onClose()
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Import failed — upload the .ics file instead.',
                      )
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {busy ? 'Importing…' : 'Try URL import'}
                </button>
              </div>
            </>
          )}

          <div className="sync-tips">
            {SOURCE_ORDER.map((id) => (
              <div key={id} className="sync-tip">
                <strong style={{ color: SOURCES[id].color }}>{SOURCES[id].label}</strong>
                <p>{SOURCES[id].tip}</p>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <div className="spacer" />
            <button type="button" className="ghost-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { fromLocalInput }
