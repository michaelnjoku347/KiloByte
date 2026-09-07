import { describe, expect, it } from 'vitest'
import { assignmentsToIcs, eventsToAssignments, parseIcs } from './ics'
import { exportBackupJson, parseBackupJson, DEFAULT_SETTINGS } from './storage'
import type { Assignment } from '../types'

const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:quiz-1@example.com
DTSTART:20260910T035900Z
DTEND:20260910T035900Z
SUMMARY:Arrays Quiz
DESCRIPTION:Module 4
END:VEVENT
END:VCALENDAR`

function sampleAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const now = new Date().toISOString()
  return {
    id: 'asg_test1',
    title: 'Midterm Study Guide',
    course: 'BCS 213',
    source: 'zybooks',
    dueAt: '2026-09-12T03:59:00.000Z',
    notes: 'Chapters 1-4',
    completed: false,
    reminderOffsets: [1440, 60],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('parseIcs', () => {
  it('parses vevents into due dates', () => {
    const events = parseIcs(sampleIcs)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Arrays Quiz')
    expect(events[0]?.uid).toBe('quiz-1@example.com')
    expect(events[0]?.notes).toContain('Module 4')
    expect(Number.isNaN(Date.parse(events[0]!.dueAt))).toBe(false)
  })
})

describe('eventsToAssignments', () => {
  it('adds new imported events and updates existing ics keys', () => {
    const events = parseIcs(sampleIcs)
    const first = eventsToAssignments(events, 'brightspace', 'BCS 213', [1440], [])
    expect(first.added).toHaveLength(1)
    expect(first.merged[0]?.notes).toContain('ics:brightspace:quiz-1@example.com')

    const updatedEvents = parseIcs(
      sampleIcs.replace('Arrays Quiz', 'Arrays Quiz Revised'),
    )
    const second = eventsToAssignments(
      updatedEvents,
      'brightspace',
      'BCS 213',
      [1440],
      first.merged,
    )
    expect(second.added).toHaveLength(0)
    expect(second.updated).toHaveLength(1)
    expect(second.updated[0]?.title).toBe('Arrays Quiz Revised')
  })
})

describe('assignmentsToIcs', () => {
  it('emits a calendar with VALARM and round-trips through parseIcs', () => {
    const ics = assignmentsToIcs([sampleAssignment()])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('SUMMARY:Midterm Study Guide')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT1440M')

    const parsed = parseIcs(ics)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.title).toBe('Midterm Study Guide')
  })
})

describe('backup json', () => {
  it('round-trips assignments', () => {
    const state = {
      assignments: [sampleAssignment()],
      settings: DEFAULT_SETTINGS,
      firedReminders: [],
    }
    const json = exportBackupJson(state)
    const restored = parseBackupJson(json)
    expect(restored.assignments).toHaveLength(1)
    expect(restored.assignments[0]?.title).toBe('Midterm Study Guide')
  })

  it('rejects invalid backups', () => {
    expect(() => parseBackupJson('{"hello":true}')).toThrow(/assignments/i)
  })
})
