/**
 * caldav.ts
 * Minimal CalDAV client over iCloud.
 *
 * Apple CalDAV endpoints:
 *   Calendar:   https://caldav.icloud.com
 *   Reminders:  https://caldav.icloud.com  (same server, different collection)
 *
 * Auth: HTTP Basic with Apple ID + App-Specific Password
 * (regular iCloud password is rejected – App Password required)
 */

export interface CalDAVConfig {
  username: string        // Apple ID email
  appPassword: string     // App-Specific Password from appleid.apple.com
  calendarUrl?: string    // Override if you already know the calendar URL
  remindersUrl?: string   // Override if you already know the reminders URL
}

export interface CalDAVEvent {
  uid: string
  summary: string
  dtstart: string         // e.g. '20260430T140000'
  dtend?: string
  description?: string
  url: string             // Full resource URL for updates/deletes
  etag?: string
}

export interface CalDAVTask {
  uid: string
  summary: string
  due?: string            // e.g. '20260502'
  description?: string
  status: 'NEEDS-ACTION' | 'COMPLETED' | 'CANCELLED'
  priority?: number       // 1=high, 5=medium, 9=low (iCalendar spec)
  url: string
  etag?: string
}

// ── iCalendar date helpers ────────────────────────────────────

export function toICalDate(dateStr: string, timeStr?: string): string {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
  const d = dateStr.replace(/-/g, '')
  if (!timeStr) return `${d}` // DATE-only (all-day)
  const t = timeStr.replace(':', '') + '00'
  return `${d}T${t}`
}

export function fromICalDate(ical: string): { date: string; time?: string } {
  // '20260430T140000' → { date: '2026-04-30', time: '14:00' }
  if (ical.includes('T')) {
    const [datePart, timePart] = ical.replace('Z', '').split('T')
    return {
      date: `${datePart.slice(0,4)}-${datePart.slice(4,6)}-${datePart.slice(6,8)}`,
      time: `${timePart.slice(0,2)}:${timePart.slice(2,4)}`,
    }
  }
  return {
    date: `${ical.slice(0,4)}-${ical.slice(4,6)}-${ical.slice(6,8)}`,
  }
}

// ── Auth header ───────────────────────────────────────────────

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

// ── CalDAV HTTP requests ──────────────────────────────────────

async function caldavRequest(
  url: string,
  method: string,
  auth: string,
  body?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; headers: Headers; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': auth,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Accept': 'text/calendar, application/xml',
      ...extraHeaders,
    },
    body,
  })
  return { status: res.status, headers: res.headers, text: await res.text() }
}

// ── Discover calendar & reminders home sets ───────────────────
// Apple requires a PROPFIND to discover the actual calendar/reminders URLs.

export async function discoverPrincipal(config: CalDAVConfig): Promise<{
  calendarHome: string
  remindersHome: string
}> {
  const auth = basicAuth(config.username, config.appPassword)
  const base = 'https://caldav.icloud.com'

  // Step 1: PROPFIND on root to find principal
  const propfindBody = `<?xml version="1.0" encoding="UTF-8"?>
<propfind xmlns="DAV:">
  <prop>
    <current-user-principal/>
  </prop>
</propfind>`

  const res = await caldavRequest(base, 'PROPFIND', auth, propfindBody, { Depth: '0' })

  // Extract principal URL from XML response
  const principalMatch = res.text.match(/<href>(\/[^<]+)<\/href>/)
  if (!principalMatch) throw new Error('CalDAV: Could not discover principal URL')
  const principalUrl = `${base}${principalMatch[1]}`

  // Step 2: PROPFIND on principal to get calendar and tasks home sets
  const homeSetBody = `<?xml version="1.0" encoding="UTF-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <C:calendar-home-set/>
    <C:schedule-inbox-URL/>
  </prop>
</propfind>`

  const homeRes = await caldavRequest(principalUrl, 'PROPFIND', auth, homeSetBody, { Depth: '0' })

  // Both calendars and reminders live under the same home set on iCloud
  const homeMatch = homeRes.text.match(/calendar-home-set[\s\S]*?<href>([^<]+)<\/href>/)
  if (!homeMatch) throw new Error('CalDAV: Could not discover calendar home')

  const home = homeMatch[1].startsWith('http') ? homeMatch[1] : `${base}${homeMatch[1]}`

  return { calendarHome: home, remindersHome: home }
}

// ── List available calendars / reminder lists ─────────────────

export async function listCollections(
  homeUrl: string,
  config: CalDAVConfig,
  type: 'VEVENT' | 'VTODO'
): Promise<Array<{ displayName: string; url: string }>> {
  const auth = basicAuth(config.username, config.appPassword)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <displayname/>
    <C:supported-calendar-component-set/>
  </prop>
</propfind>`

  const res = await caldavRequest(homeUrl, 'PROPFIND', auth, body, { Depth: '1' })

  // Parse collections that support the requested component type
  const collections: Array<{ displayName: string; url: string }> = []
  const responseBlocks = res.text.match(/<response>[\s\S]*?<\/response>/g) ?? []

  for (const block of responseBlocks) {
    if (!block.includes(type)) continue
    const nameMatch = block.match(/<displayname>([^<]*)<\/displayname>/)
    const hrefMatch = block.match(/<href>([^<]+)<\/href>/)
    if (nameMatch && hrefMatch) {
      const url = hrefMatch[1].startsWith('http')
        ? hrefMatch[1]
        : `https://caldav.icloud.com${hrefMatch[1]}`
      collections.push({ displayName: nameMatch[1], url })
    }
  }

  return collections
}

// ── Create a VEVENT (Calendar Event) ─────────────────────────

export async function createCalendarEvent(
  calendarUrl: string,
  config: CalDAVConfig,
  event: Omit<CalDAVEvent, 'url' | 'etag'>
): Promise<string> {
  const auth = basicAuth(config.username, config.appPassword)
  const resourceUrl = `${calendarUrl}${event.uid}.ics`

  const dtend = event.dtend ?? (() => {
    // Default: +1 hour if time given, +1 day if all-day
    if (event.dtstart.includes('T')) {
      const d = new Date(
        parseInt(event.dtstart.slice(0,4)),
        parseInt(event.dtstart.slice(4,6)) - 1,
        parseInt(event.dtstart.slice(6,8)),
        parseInt(event.dtstart.slice(9,11)),
        parseInt(event.dtstart.slice(11,13))
      )
      d.setHours(d.getHours() + 1)
      return toICalDate(d.toISOString().split('T')[0], `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
    }
    return event.dtstart
  })()

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Claude Assistant//Dashboard//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `SUMMARY:${event.summary}`,
    `DTSTART:${event.dtstart}`,
    `DTEND:${dtend}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    `CREATED:${toICalDate(new Date().toISOString().split('T')[0], new Date().toTimeString().slice(0,5))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const res = await caldavRequest(resourceUrl, 'PUT', auth, ical, {
    'If-None-Match': '*', // Fail if already exists
  })

  if (res.status !== 201 && res.status !== 204) {
    throw new Error(`CalDAV createEvent failed: ${res.status} ${res.text}`)
  }

  return resourceUrl
}

// ── Create a VTODO (Reminder / Task) ─────────────────────────

export async function createReminder(
  remindersUrl: string,
  config: CalDAVConfig,
  task: Omit<CalDAVTask, 'url' | 'etag'>
): Promise<string> {
  const auth = basicAuth(config.username, config.appPassword)
  const resourceUrl = `${remindersUrl}${task.uid}.ics`

  // Map our priority → iCalendar priority (1=high, 5=medium, 9=low)
  const icalPriority = task.priority ?? 5

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Claude Assistant//Dashboard//EN',
    'BEGIN:VTODO',
    `UID:${task.uid}`,
    `SUMMARY:${task.summary}`,
    task.due ? `DUE;VALUE=DATE:${task.due.replace(/-/g, '')}` : '',
    task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}` : '',
    `STATUS:${task.status}`,
    `PRIORITY:${icalPriority}`,
    `CREATED:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    'END:VTODO',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const res = await caldavRequest(resourceUrl, 'PUT', auth, ical, {
    'If-None-Match': '*',
  })

  if (res.status !== 201 && res.status !== 204) {
    throw new Error(`CalDAV createReminder failed: ${res.status} ${res.text}`)
  }

  return resourceUrl
}

// ── Update a VTODO status (e.g. mark complete) ────────────────

export async function updateTodoStatus(
  resourceUrl: string,
  config: CalDAVConfig,
  etag: string | undefined,
  newStatus: 'NEEDS-ACTION' | 'COMPLETED' | 'CANCELLED'
): Promise<void> {
  const auth = basicAuth(config.username, config.appPassword)

  // Fetch current .ics first
  const fetchRes = await caldavRequest(resourceUrl, 'GET', auth)
  if (fetchRes.status !== 200) throw new Error(`CalDAV GET failed: ${fetchRes.status}`)

  // Patch the STATUS field
  const updated = fetchRes.text
    .replace(/STATUS:[^\r\n]+/, `STATUS:${newStatus}`)
    .replace(/PERCENT-COMPLETE:[^\r\n]+(\r?\n)?/g, '')

  const headers: Record<string, string> = {}
  if (etag) headers['If-Match'] = etag

  const res = await caldavRequest(resourceUrl, 'PUT', auth, updated, headers)
  if (res.status !== 201 && res.status !== 204) {
    throw new Error(`CalDAV updateStatus failed: ${res.status}`)
  }
}

// ── Delete a resource ─────────────────────────────────────────

export async function deleteCalDAVResource(
  resourceUrl: string,
  config: CalDAVConfig
): Promise<void> {
  const auth = basicAuth(config.username, config.appPassword)
  const res = await caldavRequest(resourceUrl, 'DELETE', auth)
  if (res.status !== 200 && res.status !== 204 && res.status !== 404) {
    throw new Error(`CalDAV DELETE failed: ${res.status}`)
  }
}
