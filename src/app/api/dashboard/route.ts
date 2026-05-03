import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyOverview } from '@/lib/db'

// GET /api/dashboard
// Returns today's events, pending tasks, active reminders, overdue items.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const overview = await getDailyOverview(user.id)
    return NextResponse.json(overview)

  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
