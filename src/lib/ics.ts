import ICAL from 'ical.js'
import type { Assignment, ReminderOffset, SourceId } from '../types'
import { uid } from './storage'

export interface ParsedIcsEvent {
  uid: string
  title: string
  dueAt: string
  notes: string
  url?: string
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
      notes: description ? String(description) : '',
      url: url ? String(url) : undefined,
    })
  }

  return events.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )
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
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not fetch calendar (HTTP ${res.status}).`)
  }
  return res.text()
}
