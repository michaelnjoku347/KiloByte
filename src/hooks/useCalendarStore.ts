import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Assignment, AppSettings, AppState, FiredReminder, SourceId } from '../types'
import {
  loadState,
  rememberFired,
  saveState,
  uid,
  upsertAssignment,
  exportBackupJson,
  parseBackupJson,
  STORAGE_KEY,
} from '../lib/storage'
import {
  ensureNotificationPermission,
  getDueReminders,
  showAssignmentNotification,
} from '../lib/reminders'
import {
  eventsToAssignments,
  fetchIcsText,
  parseIcs,
  assignmentsToIcs,
} from '../lib/ics'
import type { ReminderOffset } from '../types'
import { downloadTextFile } from '../lib/download'

export function useCalendarStore() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [toast, setToast] = useState<string | null>(null)
  const skipNextSave = useRef(false)

  const { assignments, settings, firedReminders } = state

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    saveState(state)
  }, [state])

  // Keep multiple tabs in sync without re-parsing on every render.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue == null) return
      try {
        skipNextSave.current = true
        setState(loadState())
      } catch {
        // ignore malformed writes from other tabs
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const flash = useCallback((message: string) => setToast(message), [])

  const setAssignments = useCallback(
    (updater: Assignment[] | ((prev: Assignment[]) => Assignment[])) => {
      setState((prev) => ({
        ...prev,
        assignments:
          typeof updater === 'function' ? updater(prev.assignments) : updater,
      }))
    },
    [],
  )

  const setSettings = useCallback(
    (updater: AppSettings | ((prev: AppSettings) => AppSettings)) => {
      setState((prev) => ({
        ...prev,
        settings:
          typeof updater === 'function' ? updater(prev.settings) : updater,
      }))
    },
    [],
  )

  const setFiredReminders = useCallback(
    (updater: FiredReminder[] | ((prev: FiredReminder[]) => FiredReminder[])) => {
      setState((prev) => ({
        ...prev,
        firedReminders:
          typeof updater === 'function' ? updater(prev.firedReminders) : updater,
      }))
    },
    [],
  )

  const addAssignment = useCallback(
    (
      partial: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & {
        completed?: boolean
      },
    ) => {
      const now = new Date().toISOString()
      const assignment: Assignment = {
        ...partial,
        id: uid(),
        completed: partial.completed ?? false,
        createdAt: now,
        updatedAt: now,
      }
      setAssignments((prev) => [...prev, assignment])
      flash('Assignment added')
      return assignment
    },
    [flash, setAssignments],
  )

  const updateAssignment = useCallback(
    (id: string, patch: Partial<Assignment>) => {
      setAssignments((prev) => {
        const current = prev.find((a) => a.id === id)
        if (!current) return prev
        return upsertAssignment(prev, {
          ...current,
          ...patch,
          updatedAt: new Date().toISOString(),
        })
      })
    },
    [setAssignments],
  )

  const deleteAssignment = useCallback(
    (id: string) => {
      setAssignments((prev) => prev.filter((a) => a.id !== id))
      setFiredReminders((prev) => prev.filter((f) => f.assignmentId !== id))
      flash('Assignment removed')
    },
    [flash, setAssignments, setFiredReminders],
  )

  const toggleComplete = useCallback(
    (id: string) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, completed: !a.completed, updatedAt: new Date().toISOString() }
            : a,
        ),
      )
    },
    [setAssignments],
  )

  const enableNotifications = useCallback(async () => {
    const ok = await ensureNotificationPermission()
    setSettings((s) => ({ ...s, notificationsEnabled: ok }))
    flash(
      ok
        ? 'Browser reminders on (only while this tab is open). Export ICS for phone alerts.'
        : 'Notification permission blocked',
    )
    return ok
  }, [flash, setSettings])

  const importIcsText = useCallback(
    (
      text: string,
      source: SourceId,
      course: string,
      reminders?: ReminderOffset[],
    ) => {
      const events = parseIcs(text)
      if (events.length === 0) {
        flash('No events found in that calendar file')
        return { added: 0, updated: 0 }
      }
      let result = { added: 0, updated: 0 }
      setAssignments((prev) => {
        const { added, updated, merged } = eventsToAssignments(
          events,
          source,
          course,
          reminders ?? settings.defaultReminders,
          prev,
        )
        result = { added: added.length, updated: updated.length }
        return merged
      })
      flash(
        `Imported ${result.added} new · updated ${result.updated} from ${source}`,
      )
      return result
    },
    [flash, setAssignments, settings.defaultReminders],
  )

  const importIcsUrl = useCallback(
    async (url: string, source: SourceId, course: string) => {
      const text = await fetchIcsText(url)
      setSettings((s) => ({
        ...s,
        icsUrls: { ...s.icsUrls, [source]: url },
      }))
      return importIcsText(text, source, course)
    },
    [importIcsText, setSettings],
  )

  const exportIcsFile = useCallback(() => {
    const open = assignments.filter((a) => !a.completed)
    if (open.length === 0) {
      flash('No open deadlines to export')
      return
    }
    const ics = assignmentsToIcs(open)
    downloadTextFile(
      `syllabus-deadlines-${new Date().toISOString().slice(0, 10)}.ics`,
      ics,
      'text/calendar;charset=utf-8',
    )
    flash('ICS downloaded — import it into Google/Apple Calendar for phone reminders')
  }, [assignments, flash])

  const exportBackup = useCallback(() => {
    downloadTextFile(
      `syllabus-backup-${new Date().toISOString().slice(0, 10)}.json`,
      exportBackupJson(state),
      'application/json;charset=utf-8',
    )
    flash('Backup JSON downloaded')
  }, [flash, state])

  const importBackupText = useCallback(
    (text: string) => {
      const next = parseBackupJson(text)
      skipNextSave.current = false
      setState(next)
      flash(`Restored ${next.assignments.length} assignments from backup`)
    },
    [flash],
  )

  const resetDemoData = useCallback(() => {
    const notificationsEnabled = settings.notificationsEnabled
    localStorage.removeItem(STORAGE_KEY)
    const fresh = loadState()
    setState({
      ...fresh,
      settings: { ...fresh.settings, notificationsEnabled },
    })
    flash('Demo deadlines restored')
  }, [flash, settings.notificationsEnabled])

  useEffect(() => {
    if (!settings.notificationsEnabled) return

    const tick = () => {
      const due = getDueReminders(assignments, firedReminders)
      if (due.length === 0) return
      setFiredReminders((prev) => {
        let next = prev
        for (const item of due) {
          showAssignmentNotification(item.assignment, item.offset)
          next = rememberFired(next, {
            assignmentId: item.assignment.id,
            offset: item.offset,
            firedAt: new Date().toISOString(),
          })
        }
        return next
      })
    }

    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [assignments, firedReminders, setFiredReminders, settings.notificationsEnabled])

  const stats = useMemo(() => {
    const open = assignments.filter((a) => !a.completed)
    const overdue = open.filter((a) => new Date(a.dueAt).getTime() < Date.now())
    const week = open.filter((a) => {
      const t = new Date(a.dueAt).getTime() - Date.now()
      return t >= 0 && t <= 7 * 24 * 36e5
    })
    return { open: open.length, overdue: overdue.length, week: week.length }
  }, [assignments])

  return {
    assignments,
    settings,
    setSettings,
    toast,
    flash,
    stats,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
    enableNotifications,
    importIcsText,
    importIcsUrl,
    exportIcsFile,
    exportBackup,
    importBackupText,
    resetDemoData,
  }
}
