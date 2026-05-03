import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateEntry, deleteEntry } from '@/lib/db'
import type { UpdateEntryPayload } from '@/types'

// PATCH /api/entries/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body: UpdateEntryPayload = await req.json()

    const entry = await updateEntry(user.id, id, body)
    return NextResponse.json({ entry })

  } catch (err) {
    console.error('[PATCH /api/entries/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/entries/[id]  (soft delete → status: cancelled)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await deleteEntry(user.id, id)
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[DELETE /api/entries/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
