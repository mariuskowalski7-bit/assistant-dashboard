import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAndPersist, getCalDAVConfig, getSyncUrls } from '@/lib/sync/router'
import type { Entry } from '@/types'

/**
 * POST /api/sync/reminders
 * Body: { entryId: string }
 *
 * Syncs a task or reminder entry to Apple Reminders.
 * Accepts type='task' and type='reminder'.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId } = await req.json()
    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    const { data: entry, error: dbError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const type = (entry as Entry).type
    if (type !== 'task' && type !== 'reminder') {
      return NextResponse.json(
        { error: `Entry type '${type}' cannot be synced to Reminders. Use /api/sync/calendar for events.` },
        { status: 422 }
      )
    }

    if ((entry as Entry).apple_id) {
      return NextResponse.json(
        { message: 'Already synced', appleId: (entry as Entry).apple_id },
        { status: 200 }
      )
    }

    const config = getCalDAVConfig()
    const urls = getSyncUrls()

    const result = await syncAndPersist(entry as Entry, user.id, config, urls)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ ok: true, appleId: result.appleId })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/sync/reminders]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
