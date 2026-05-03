import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { discoverPrincipal, listCollections } from '@/lib/sync/caldav'
import { getCalDAVConfig } from '@/lib/sync/router'

/**
 * GET /api/sync/status
 *
 * Two purposes:
 * 1. Verify that Apple credentials work
 * 2. Discover and return the correct CalDAV URLs for APPLE_CALENDAR_URL
 *    and APPLE_REMINDERS_URL (copy output to .env.local)
 *
 * Run this once during setup to get the URLs.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = getCalDAVConfig()

    // Discover principal and home sets
    const { calendarHome, remindersHome } = await discoverPrincipal(config)

    // List available calendars (VEVENT) and reminder lists (VTODO)
    const [calendars, reminderLists] = await Promise.all([
      listCollections(calendarHome, config, 'VEVENT'),
      listCollections(remindersHome, config, 'VTODO'),
    ])

    // Check if env URLs are already configured
    const envCalUrl = process.env.APPLE_CALENDAR_URL
    const envRemUrl = process.env.APPLE_REMINDERS_URL

    return NextResponse.json({
      status: 'connected',
      appleId: config.username,
      discovered: {
        calendarHome,
        calendars,
        reminderLists,
      },
      configured: {
        calendarUrl: envCalUrl ?? null,
        remindersUrl: envRemUrl ?? null,
        isComplete: !!(envCalUrl && envRemUrl),
      },
      // Hint: copy these to .env.local
      setupHint: !envCalUrl || !envRemUrl
        ? 'Copy a calendar URL from discovered.calendars and a list URL from discovered.reminderLists to your .env.local'
        : null,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/sync/status]', msg)

    // Provide helpful error context
    const isAuthError = msg.toLowerCase().includes('401') || msg.toLowerCase().includes('unauthorized')
    return NextResponse.json({
      status: 'error',
      error: msg,
      hint: isAuthError
        ? 'Check APPLE_ID and APPLE_APP_PASSWORD. Use an App-Specific Password from appleid.apple.com → Security → App-Specific Passwords'
        : 'Check your network and environment variables.',
    }, { status: 502 })
  }
}
