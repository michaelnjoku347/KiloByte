import ICAL from 'ical.js'
import type { Assignment, ReminderOffset, SourceId } from '../types'
import { uid } from './storage'
import { SOURCES } from '../data/sources'

export interface ParsedIcsEvent {
  uid: string
  title: string
  dueAt: string
  notes: string
  url?: string
}

function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let remaining = line
  chunks.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, 74)}`)
    remaining = remaining.slice(74)
  }
  return chunks.join('\r\n')
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

export function parseIcs(text: string): ParsedIcsEvent[] {
  const jcal = ICAL.parse(text)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')
  const events: ParsedIcsEvent[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    const start = event.startDate?.toJSDate()
    const end = event.endDate?.toJSDate()
    const due = end ?? start
    if (!due) continue

    const description = vevent.getFirstPropertyValue('description')
    const url = vevent.getFirstPropertyValue('url')
    const eventUid = event.uid || `${event.summary}-${due.toISOString()}`

    events.push({
      uid: String(eventUid),
      title: event.summary || 'Untitled event',
      dueAt: due.toISOString(),
      notes: description != null ? String(description) : '',
      url: url != null ? String(url) : undefined,
    })
  }

  return events.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )
}

export function assignmentsToIcs(assignments: Assignment[]): string {
  const stamp = toIcsUtc(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Syllabus//Academic Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Syllabus Deadlines',
  ]

  for (const assignment of assignments) {
    const due = toIcsUtc(assignment.dueAt)
    const description = [
      assignment.course,
      `Source: ${SOURCES[assignment.source].label}`,
      assignment.notes.replace(/\s*\|\s*ics:[^\s|]+/g, '').trim(),
    ]
      .filter(Boolean)
      .join('\n')

    lines.push('BEGIN:VEVENT')
    lines.push(foldLine(`UID:${assignment.id}@syllabus.local`))
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${due}`)
    lines.push(`DTEND:${due}`)
    lines.push(foldLine(`SUMMARY:${escapeText(assignment.title)}`))
    if (description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`))
    }
    lines.push(foldLine(`CATEGORIES:${SOURCES[assignment.source].shortLabel}`))
    if (assignment.url) {
      lines.push(foldLine(`URL:${assignment.url}`))
    }
    // VALARM: 1 day before when configured, else 1 hour
    const offsetMinutes =
      assignment.reminderOffsets.find((o) => o > 0) ?? 60
    lines.push('BEGIN:VALARM')
    lines.push('ACTION:DISPLAY')
    lines.push(foldLine(`DESCRIPTION:${escapeText(assignment.title)}`))
    lines.push(`TRIGGER:-PT${offsetMinutes}M`)
    lines.push('END:VALARM')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

export function eventsToAssignments(
  events: ParsedIcsEvent[],
  source: SourceId,
  course: string,
  reminders: ReminderOffset[],
  existing: Assignment[],
): { added: Assignment[]; updated: Assignment[]; merged: Assignment[] } {
  const byImportKey = new Map(
    existing
      .filter((a) => a.notes.includes('ics:'))
      .map((a) => {
        const match = a.notes.match(/ics:([^\s|]+)/)
        return match ? ([match[1], a] as const) : null
      })
      .filter((x): x is readonly [string, Assignment] => Boolean(x)),
  )

  const added: Assignment[] = []
  const updated: Assignment[] = []
  const kept = [...existing]
  const now = new Date().toISOString()

  for (const event of events) {
    const key = `${source}:${event.uid}`
    const prev = byImportKey.get(key)
    const notes = [event.notes, `ics:${key}`].filter(Boolean).join(' | ')

    if (prev) {
      const next: Assignment = {
        ...prev,
        title: event.title,
        course: course || prev.course,
        dueAt: event.dueAt,
        notes,
        url: event.url ?? prev.url,
        updatedAt: now,
      }
      const idx = kept.findIndex((a) => a.id === prev.id)
      if (idx >= 0) kept[idx] = next
      updated.push(next)
    } else {
      const created: Assignment = {
        id: uid('ics'),
        title: event.title,
        course: course || SOURCES_COURSE_FALLBACK[source],
        source,
        dueAt: event.dueAt,
        notes,
        completed: false,
        reminderOffsets: reminders,
        url: event.url,
        createdAt: now,
        updatedAt: now,
      }
      kept.push(created)
      added.push(created)
    }
  }

  return { added, updated, merged: kept }
}

const SOURCES_COURSE_FALLBACK: Record<SourceId, string> = {
  brightspace: 'Brightspace',
  cengage: 'Cengage',
  zybooks: 'Zybooks',
  vhl: 'VHL Central',
  other: 'Imported',
}

export async function fetchIcsText(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error(
      'Browser blocked the feed (usually CORS). Download the .ics from Brightspace and upload the file instead.',
    )
  }
  if (!res.ok) {
    throw new Error(`Could not fetch calendar (HTTP ${res.status}).`)
  }
  return res.text()
}
