import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type EntryType = 'event' | 'task' | 'reminder' | 'note'

function getInputFromBody(body: unknown): string {
  const obj = body as Record<string, unknown>

  if (typeof obj.message === 'string') return obj.message
  if (typeof obj.input === 'string') return obj.input
  if (typeof obj.text === 'string') return obj.text

  if (Array.isArray(obj.messages) && obj.messages.length > 0) {
    const last = obj.messages[obj.messages.length - 1] as Record<string, unknown>
    if (typeof last.content === 'string') return last.content
  }

  return ''
}

function classifyInput(input: string): EntryType {
  const text = input.toLowerCase()

  const hasTime =
    /\b\d{1,2}\s?uhr\b/.test(text) ||
    /\b\d{1,2}:\d{2}\b/.test(text)

  const hasDateWord =
    text.includes('morgen') ||
    text.includes('heute') ||
    text.includes('übermorgen') ||
    text.includes('montag') ||
    text.includes('dienstag') ||
    text.includes('mittwoch') ||
    text.includes('donnerstag') ||
    text.includes('freitag') ||
    text.includes('samstag') ||
    text.includes('sonntag')

  if (
    text.includes('erinnere') ||
    text.includes('nicht vergessen') ||
    text.includes('denk daran')
  ) {
    return 'reminder'
  }

  if (hasTime && hasDateWord) {
    return 'event'
  }

  if (
    text.includes('bis ') ||
    text.includes('muss') ||
    text.includes('todo') ||
    text.includes('aufgabe') ||
    text.includes('erledigen')
  ) {
    return 'task'
  }

  return 'note'
}

function createReply(input: string, type: EntryType, saved: boolean): string {
  const savedText = saved ? ' und gespeichert' : ''

  if (type === 'event') {
    return `Alles klar, ich habe das als Termin erkannt${savedText}: „${input}“.`
  }

  if (type === 'task') {
    return `Alles klar, ich habe das als Aufgabe erkannt${savedText}: „${input}“.`
  }

  if (type === 'reminder') {
    return `Alles klar, ich habe das als Erinnerung erkannt${savedText}: „${input}“.`
  }

  return `Alles klar, ich habe mir das als Notiz gemerkt${savedText}: „${input}“.`
}

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!rawUrl || !rawKey) {
    return null
  }

  const url = rawUrl
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '')

  return {
    url,
    key: rawKey,
  }
}

async function saveEntry(input: string, type: EntryType) {
  const config = getSupabaseConfig()

  if (!config) {
    return {
      saved: false,
      error: 'Supabase URL oder Key fehlt.',
    }
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/entries`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        type,
        title: input,
        status: 'pending',
        source: 'fallback-chat',
        metadata: {
          originalInput: input,
          createdBy: 'zero-cost-fallback',
        },
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return {
        saved: false,
        error: responseText || `Supabase insert failed with status ${response.status}`,
      }
    }

    return {
      saved: true,
      error: null,
    }
  } catch (error) {
    return {
      saved: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = getInputFromBody(body).trim()

    if (!input) {
      return NextResponse.json(
        {
          reply: 'Ich habe keine Eingabe erkannt.',
          message: 'Ich habe keine Eingabe erkannt.',
          type: 'note',
          saved: false,
        },
        { status: 200 }
      )
    }

    const type = classifyInput(input)
    const result = await saveEntry(input, type)
    const reply = createReply(input, type, result.saved)

    return NextResponse.json(
      {
        reply,
        message: reply,
        content: reply,
        type,
        saved: result.saved,
        saveError: result.error,
        entry: {
          title: input,
          type,
          status: 'pending',
          source: 'fallback-chat',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        reply: 'Es gab einen Fehler im Chat-Fallback.',
        message: 'Es gab einen Fehler im Chat-Fallback.',
        error: error instanceof Error ? error.message : String(error),
        saved: false,
      },
      { status: 200 }
    )
  }
}