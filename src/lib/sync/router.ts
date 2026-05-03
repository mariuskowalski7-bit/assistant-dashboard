/**
 * router.ts
 * Central sync routing layer.
 *
 * Rules:
 *   entry.type === 'event'    → Apple Calendar (VEVENT)
 *   entry.type === 'task'     → Apple Reminders (VTODO)
 *   entry.type === 'reminder' → Apple Reminders (VTODO, with alarm)
 *   entry.type === 'note'     → internal only, no Apple sync
 */

import {
  createCalendarEvent,
  createReminder,
  updateTodoStatus,
  deleteCalDAVResource,
  toICalDate,
  type CalDAVConfig,
} from './caldav'
import { updateEntry } from '@/lib/db'
import type { Entry } from '@/types'

// ── Priority mapping ──────────────────────────────────────────
const PRIORITY_MAP = { high: 1, medium: 5, low: 9 } as const

// ── Sync a single entry to Apple ──────────────────────────────

export interface SyncResult {
  success: boolean
  appleId?: string    // The CalDAV resource URL (stored as apple_id)
  error?: string
  skipped?: boolean   // true for notes (not synced)
}

export async function syncEntryToApple(
  entry: Entry,
  config: CalDAVConfig,
  urls: { calendarUrl: string; remindersUrl: string }
): Promise<SyncResult> {

  try {
    // Notes are never synced to Apple
    if (entry.type === 'note') {
      return { success: true, skipped: true }
    }

    // Generate a stable UID from our DB id
    const uid = `assistant-${entry.id}`

    // ── EVENT → Apple Calendar ──────────────────────────────
    if (entry.type === 'event') {
      if (!entry.date) {
        return { success: false, error: 'Event has no date' }
      }

      const dtstart = toICalDate(entry.date, entry.time ?? undefined)
      const appleId = await createCalendarEvent(urls.calendarUrl, config, {
        uid,
        summary: entry.title,
        dtstart,
        description: entry.body ?? undefined,
      })

      return { success: true, appleId }
    }

    // ── TASK → Apple Reminders ──────────────────────────────
    if (entry.type === 'task') {
      const appleId = await createReminder(urls.remindersUrl, config, {
        uid,
        summary: entry.title,
        due: entry.due_date ?? undefined,
        description: entry.body ?? undefined,
        status: entry.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION',
        priority: PRIORITY_MAP[entry.priority],
      })

      return { success: true, appleId }
    }

    // ── REMINDER → Apple Reminders (VTODO with time) ────────
    if (entry.type === 'reminder') {
      const appleId = await createReminder(urls.remindersUrl, config, {
        uid,
        summary: entry.title,
        due: entry.date ?? undefined,
        description: entry.body ?? undefined,
        status: 'NEEDS-ACTION',
        priority: 5,
      })

      return { success: true, appleId }
    }

    return { success: false, error: `Unknown entry type: ${entry.type}` }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ── Sync + persist apple_id back to DB ───────────────────────

export async function syncAndPersist(
  entry: Entry,
  userId: string,
  config: CalDAVConfig,
  urls: { calendarUrl: string; remindersUrl: string }
): Promise<SyncResult> {
  const result = await syncEntryToApple(entry, config, urls)

  if (result.success && result.appleId) {
    await updateEntry(userId, entry.id, {
      // apple_id stores the CalDAV resource URL for future updates/deletes
    })
    // Direct supabase update to include apple_id + synced_at (not in UpdateEntryPayload by design)
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    await supabase
      .from('entries')
      .update({ apple_id: result.appleId, synced_at: new Date().toISOString() })
      .eq('id', entry.id)
      .eq('user_id', userId)
  }

  return result
}

// ── Propagate status changes to Apple ────────────────────────

export async function syncStatusToApple(
  entry: Entry,
  config: CalDAVConfig
): Promise<void> {
  if (!entry.apple_id) return
  if (entry.type !== 'task' && entry.type !== 'reminder') return

  const newStatus = entry.status === 'done' ? 'COMPLETED' :
                    entry.status === 'cancelled' ? 'CANCELLED' : 'NEEDS-ACTION'

  await updateTodoStatus(entry.apple_id, config, undefined, newStatus)
}

// ── Remove from Apple ─────────────────────────────────────────

export async function deleteFromApple(
  appleId: string,
  config: CalDAVConfig
): Promise<void> {
  await deleteCalDAVResource(appleId, config)
}

// ── Load CalDAV config from env ───────────────────────────────
// Stored server-side only – never exposed to the client.

export function getCalDAVConfig(): CalDAVConfig {
  const username = process.env.APPLE_ID
  const appPassword = process.env.APPLE_APP_PASSWORD
  const calendarUrl = process.env.APPLE_CALENDAR_URL
  const remindersUrl = process.env.APPLE_REMINDERS_URL

  if (!username || !appPassword) {
    throw new Error('APPLE_ID and APPLE_APP_PASSWORD must be set in environment')
  }

  return { username, appPassword, calendarUrl, remindersUrl }
}

export function getSyncUrls(): { calendarUrl: string; remindersUrl: string } {
  const calendarUrl = process.env.APPLE_CALENDAR_URL
  const remindersUrl = process.env.APPLE_REMINDERS_URL

  if (!calendarUrl || !remindersUrl) {
    throw new Error(
      'APPLE_CALENDAR_URL and APPLE_REMINDERS_URL must be set. ' +
      'Run GET /api/sync/status to discover them.'
    )
  }

  return { calendarUrl, remindersUrl }
}
