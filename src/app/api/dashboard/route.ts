import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Entry = {
  id?: string
  user_id?: string | null
  type?: string | null
  title?: string | null
  status?: string | null
  source?: string | null
  created_at?: string | null
  updated_at?: string | null
  due_at?: string | null
  start_at?: string | null
  metadata?: unknown
  [key: string]: unknown
}

function normalizeSupabaseUrl(rawUrl?: string) {
  if (!rawUrl) return null

  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '')
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) return null

  return { url, key }
}

async function loadEntries(): Promise<{
  entries: Entry[]
  error: string | null
}> {
  const config = getSupabaseConfig()

  if (!config) {
    return {
      entries: [],
      error: 'Supabase URL oder Key fehlt.',
    }
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/entries?select=*&order=created_at.desc&limit=100`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          apikey: config.key,
          ...(config.key.startsWith('eyJ')
            ? { Authorization: `Bearer ${config.key}` }
            : {}),
        },
      }
    )

    const text = await response.text()

    if (!response.ok) {
      return {
        entries: [],
        error: text || `Supabase read failed with status ${response.status}`,
      }
    }

    const entries = JSON.parse(text) as Entry[]

    return {
      entries,
      error: null,
    }
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET() {
  const { entries, error } = await loadEntries()

  const events = entries.filter((entry) => entry.type === 'event')
  const tasks = entries.filter((entry) => entry.type === 'task')
  const reminders = entries.filter((entry) => entry.type === 'reminder')
  const notes = entries.filter((entry) => entry.type === 'note')

  return NextResponse.json(
    {
      ok: !error,
      mode: 'fallback',
      error,
      entries,
      events,
      tasks,
      reminders,
      notes,
      counts: {
        total: entries.length,
        events: events.length,
        tasks: tasks.length,
        reminders: reminders.length,
        notes: notes.length,
      },
    },
    { status: 200 }
  )
}