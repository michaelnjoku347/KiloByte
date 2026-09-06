import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Assignment, AppSettings, FiredReminder, SourceId } from '../types'
import {
  loadState,
  rememberFired,
  saveState,
  uid,
  upsertAssignment,
} from '../lib/storage'
import {
  ensureNotificationPermission,
  getDueReminders,
  showAssignmentNotification,
} from '../lib/reminders'
import { eventsToAssignments, fetchIcsText, parseIcs } from '../lib/ics'
import type { ReminderOffset } from '../types'

export function useCalendarStore() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [settings, setSettings] = useState<AppSettings>(() => loadState().settings)
  const [firedReminders, setFiredReminders] = useState<FiredReminder[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const state = loadState()
    setAssignments(state.assignments)
    setSettings(state.settings)
    setFiredReminders(state.firedReminders)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveState({ assignments, settings, firedReminders })
  }, [assignments, settings, firedReminders, hydrated])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const flash = useCallback((message: string) => setToast(message), [])

  const addAssignment = useCallback(
    (partial: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & { completed?: boolean }) => {
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
    [flash],
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
    [],
  )

  const deleteAssignment = useCallback(
    (id: string) => {
      setAssignments((prev) => prev.filter((a) => a.id !== id))
      setFiredReminders((prev) => prev.filter((f) => f.assignmentId !== id))
      flash('Assignment removed')
    },
    [flash],
  )

  const toggleComplete = useCallback((id: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, completed: !a.completed, updatedAt: new Date().toISOString() }
          : a,
      ),
    )
  }, [])

  const enableNotifications = useCallback(async () => {
    const ok = await ensureNotificationPermission()
    setSettings((s) => ({ ...s, notificationsEnabled: ok }))
    flash(ok ? 'Browser reminders enabled' : 'Notification permission blocked')
    return ok
  }, [flash])

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
      const current = assignments
      const { added, updated, merged } = eventsToAssignments(
        events,
        source,
        course,
        reminders ?? settings.defaultReminders,
        current,
      )
      setAssignments(merged)
      const result = { added: added.length, updated: updated.length }
      flash(
        `Imported ${result.added} new · updated ${result.updated} from ${source}`,
      )
      return result
    },
    [assignments, flash, settings.defaultReminders],
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
    [importIcsText],
  )

  const resetDemoData = useCallback(() => {
    const state = loadState()
    // Force reseed by clearing and using seed from a fresh default
    localStorage.removeItem('syllabus.calendar.v1')
    const fresh = loadState()
    setAssignments(fresh.assignments)
    setSettings({ ...fresh.settings, notificationsEnabled: state.settings.notificationsEnabled })
    setFiredReminders([])
    flash('Demo deadlines restored')
  }, [flash])

  // Reminder ticker
  useEffect(() => {
    if (!hydrated || !settings.notificationsEnabled) return

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
  }, [assignments, firedReminders, hydrated, settings.notificationsEnabled])

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
    hydrated,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
    enableNotifications,
    importIcsText,
    importIcsUrl,
    resetDemoData,
  }
}
