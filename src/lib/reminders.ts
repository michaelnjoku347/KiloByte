import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import type { Assignment, FiredReminder, ReminderOffset } from '../types'

export function formatDue(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`
  return format(d, 'EEE, MMM d · h:mm a')
}

export function dueUrgency(iso: string, completed: boolean): 'done' | 'overdue' | 'soon' | 'later' {
  if (completed) return 'done'
  const d = new Date(iso)
  if (isPast(d)) return 'overdue'
  const hours = (d.getTime() - Date.now()) / 36e5
  if (hours <= 48) return 'soon'
  return 'later'
}

export function relativeDue(iso: string): string {
  const d = new Date(iso)
  if (isPast(d)) return `Overdue ${formatDistanceToNow(d, { addSuffix: true })}`
  return formatDistanceToNow(d, { addSuffix: true })
}

export interface DueReminder {
  assignment: Assignment
  offset: ReminderOffset
  fireAt: number
}

export function getDueReminders(
  assignments: Assignment[],
  fired: FiredReminder[],
  now = Date.now(),
): DueReminder[] {
  const due: DueReminder[] = []
  for (const assignment of assignments) {
    if (assignment.completed) continue
    const dueMs = new Date(assignment.dueAt).getTime()
    for (const offset of assignment.reminderOffsets) {
      const fireAt = dueMs - offset * 60_000
      if (fireAt > now) continue
      const already = fired.some(
        (f) => f.assignmentId === assignment.id && f.offset === offset,
      )
      if (already) continue
      // Only fire if within a reasonable window (last 36 hours) to avoid spam on first load of old items
      if (now - fireAt > 36 * 36e5) continue
      due.push({ assignment, offset, fireAt })
    }
  }
  return due.sort((a, b) => a.fireAt - b.fireAt)
}

export function reminderLabel(offset: ReminderOffset): string {
  switch (offset) {
    case 0:
      return 'due now'
    case 60:
      return 'due in 1 hour'
    case 1440:
      return 'due in 1 day'
    case 4320:
      return 'due in 3 days'
    case 10080:
      return 'due in 1 week'
    default:
      return 'upcoming'
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showAssignmentNotification(
  assignment: Assignment,
  offset: ReminderOffset,
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = `${assignment.course} · ${reminderLabel(offset)}\n${formatDue(assignment.dueAt)}`
  const n = new Notification(`Syllabus · ${assignment.title}`, {
    body,
    tag: `${assignment.id}-${offset}`,
    icon: '/favicon.svg',
  })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}
