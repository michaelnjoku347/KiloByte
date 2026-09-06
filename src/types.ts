export type SourceId =
  | 'brightspace'
  | 'cengage'
  | 'zybooks'
  | 'vhl'
  | 'other'

export type ViewMode = 'month' | 'week' | 'agenda'

export type ReminderOffset = 0 | 60 | 1440 | 4320 | 10080

export interface Assignment {
  id: string
  title: string
  course: string
  source: SourceId
  dueAt: string
  notes: string
  completed: boolean
  reminderOffsets: ReminderOffset[]
  url?: string
  createdAt: string
  updatedAt: string
}

export interface SourceMeta {
  id: SourceId
  label: string
  shortLabel: string
  color: string
  soft: string
  tip: string
}

export interface FiredReminder {
  assignmentId: string
  offset: ReminderOffset
  firedAt: string
}

export interface AppSettings {
  notificationsEnabled: boolean
  defaultReminders: ReminderOffset[]
  icsUrls: Partial<Record<SourceId, string>>
}

export interface AppState {
  assignments: Assignment[]
  settings: AppSettings
  firedReminders: FiredReminder[]
}
