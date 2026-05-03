import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithClaude } from '@/lib/claude'
import { createEntry, getPreferences } from '@/lib/db'
import { syncAndPersist, getCalDAVConfig, getSyncUrls } from '@/lib/sync/router'
import type { ChatPayload, Entry } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChatPayload = await req.json()
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const preferences = await getPreferences(user.id)

    const { reply, extracted } = await chatWithClaude(
      body.message,
      body.history ?? [],
      preferences
    )

    let savedEntry: Entry | null = null
    let syncResult: { success: boolean; appleId?: string; skipped?: boolean; error?: string } | null = null

    if (extracted) {
      savedEntry = await createEntry(user.id, {
        type:     extracted.type,
        title:    extracted.title,
        date:     extracted.date ?? undefined,
        time:     extracted.time ?? undefined,
        due_date: extracted.due_date ?? undefined,
        priority: extracted.priority ?? 'medium',
        context:  extracted.context ?? undefined,
      })

      if (extracted.type === 'note' && extracted.context) {
        const { upsertPreference } = await import('@/lib/db')
        await upsertPreference(user.id, extracted.context, extracted.title)
      }

      // Auto-sync to Apple (non-blocking – never crashes the chat response)
      if (process.env.APPLE_ID && process.env.APPLE_APP_PASSWORD &&
          process.env.APPLE_CALENDAR_URL && process.env.APPLE_REMINDERS_URL) {
        try {
          const config = getCalDAVConfig()
          const urls = getSyncUrls()
          syncResult = await syncAndPersist(savedEntry, user.id, config, urls)
        } catch (syncErr) {
          console.error('[chat] Apple sync failed (non-fatal):', syncErr)
          syncResult = { success: false, error: String(syncErr) }
        }
      }
    }

    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user',      content: body.message },
      { user_id: user.id, role: 'assistant', content: reply, extracted: extracted ?? null },
    ])

    return NextResponse.json({ reply, extracted, savedEntry, sync: syncResult })

  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
