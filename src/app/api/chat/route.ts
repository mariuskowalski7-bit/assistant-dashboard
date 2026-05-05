import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type EntryType = 'event' | 'task' | 'reminder' | 'note'

function getInputFromBody(body: any): string {
  if (typeof body?.message === 'string') return body.message
  if (typeof body?.input === 'string') return body.input
  if (typeof body?.text === 'string') return body.text

  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    const last = body.messages[body.messages.length - 1]
    if (typeof last?.content === 'string') return last.content
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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
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
    const supabase = getSupabaseAdmin()

    let saved = false
    let saveError: string | null = null

    if (supabase) {
      const { error } = await supabase.from('entries').insert({
        type,
        title: input,
        status: 'pending',
        source: 'fallback-chat',
        metadata: {
          originalInput: input,
          createdBy: 'zero-cost-fallback',
        },
      })

      if (error) {
        saveError = error.message
        console.error('Entry save error:', error)
      } else {
        saved = true
      }
    } else {
      saveError = 'SUPABASE_SERVICE_ROLE_KEY fehlt.'
    }

    const reply = createReply(input, type, saved)

    return NextResponse.json(
      {
        reply,
        message: reply,
        content: reply,
        type,
        saved,
        saveError,
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
    console.error('Chat route error:', error)

    return NextResponse.json(
      {
        reply: 'Es gab einen Fehler im Chat-Fallback.',
        message: 'Es gab einen Fehler im Chat-Fallback.',
        error: 'chat_fallback_error',
        saved: false,
      },
      { status: 200 }
    )
  }
}