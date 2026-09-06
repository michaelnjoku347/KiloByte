import type { AppSettings, AppState, Assignment, FiredReminder } from '../types'
import { createSeedAssignments } from '../data/seed'

const STORAGE_KEY = 'syllabus.calendar.v1'

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  defaultReminders: [1440, 60],
  icsUrls: {},
}

function defaultState(): AppState {
  return {
    assignments: createSeedAssignments(),
    settings: DEFAULT_SETTINGS,
    firedReminders: [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      assignments: Array.isArray(parsed.assignments)
        ? parsed.assignments
        : createSeedAssignments(),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        defaultReminders:
          parsed.settings?.defaultReminders ?? DEFAULT_SETTINGS.defaultReminders,
        icsUrls: parsed.settings?.icsUrls ?? {},
      },
      firedReminders: Array.isArray(parsed.firedReminders)
        ? parsed.firedReminders
        : [],
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function uid(prefix = 'asg'): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function upsertAssignment(
  list: Assignment[],
  assignment: Assignment,
): Assignment[] {
  const idx = list.findIndex((a) => a.id === assignment.id)
  if (idx === -1) return [...list, assignment]
  const next = [...list]
  next[idx] = assignment
  return next
}

export function rememberFired(
  fired: FiredReminder[],
  entry: FiredReminder,
): FiredReminder[] {
  const exists = fired.some(
    (f) => f.assignmentId === entry.assignmentId && f.offset === entry.offset,
  )
  return exists ? fired : [...fired, entry]
}
