import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEntry, getEntries } from '@/lib/db'
import type { CreateEntryPayload } from '@/types'

// GET /api/entries?type=task&status=pending
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const filters = {
      type:   searchParams.get('type')   ?? undefined,
      status: searchParams.get('status') ?? undefined,
    }

    const entries = await getEntries(user.id, filters)
    return NextResponse.json({ entries })

  } catch (err) {
    console.error('[GET /api/entries]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/entries  – manual entry creation (Quick Capture)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: CreateEntryPayload = await req.json()
    if (!body.type || !body.title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
    }

    const entry = await createEntry(user.id, body)
    return NextResponse.json({ entry }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/entries]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
