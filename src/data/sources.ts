import type { SourceMeta, SourceId } from '../types'

export const SOURCES: Record<SourceId, SourceMeta> = {
  brightspace: {
    id: 'brightspace',
    label: 'Brightspace (FSC)',
    shortLabel: 'Brightspace',
    color: '#1a6bb5',
    soft: 'rgba(26, 107, 181, 0.14)',
    tip: 'In Brightspace: Calendar → Subscribe → copy the ICS feed URL, then paste it under Import.',
  },
  cengage: {
    id: 'cengage',
    label: 'Cengage',
    shortLabel: 'Cengage',
    color: '#c45a1a',
    soft: 'rgba(196, 90, 26, 0.14)',
    tip: 'Open your Cengage course, note due dates, then Quick Add with source set to Cengage.',
  },
  zybooks: {
    id: 'zybooks',
    label: 'Zybooks',
    shortLabel: 'Zybooks',
    color: '#0f7a62',
    soft: 'rgba(15, 122, 98, 0.14)',
    tip: 'Check each Zybook chapter due date, then add here so reminders fire before participation closes.',
  },
  vhl: {
    id: 'vhl',
    label: 'VHL Central',
    shortLabel: 'VHL',
    color: '#8a3d55',
    soft: 'rgba(138, 61, 85, 0.14)',
    tip: 'From VHL Central activities, add each graded submission with its due time for push reminders.',
  },
  other: {
    id: 'other',
    label: 'Other / Manual',
    shortLabel: 'Other',
    color: '#4a5560',
    soft: 'rgba(74, 85, 96, 0.14)',
    tip: 'Use for campus events, advisor meetings, or any deadline outside the four platforms.',
  },
}

export const SOURCE_ORDER: SourceId[] = [
  'brightspace',
  'cengage',
  'zybooks',
  'vhl',
  'other',
]

export const REMINDER_OPTIONS = [
  { value: 10080 as const, label: '1 week before' },
  { value: 4320 as const, label: '3 days before' },
  { value: 1440 as const, label: '1 day before' },
  { value: 60 as const, label: '1 hour before' },
  { value: 0 as const, label: 'At due time' },
]
