import { NextResponse } from 'next/server'

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

function createReply(input: string, type: EntryType): string {
  if (type === 'event') {
    return `Alles klar, ich habe das als Termin erkannt: „${input}“.`
  }

  if (type === 'task') {
    return `Alles klar, ich habe das als Aufgabe erkannt: „${input}“.`
  }

  if (type === 'reminder') {
    return `Alles klar, ich habe das als Erinnerung erkannt: „${input}“.`
  }

  return `Alles klar, ich habe mir das als Notiz gemerkt: „${input}“.`
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
        },
        { status: 200 }
      )
    }

    const type = classifyInput(input)
    const reply = createReply(input, type)

    return NextResponse.json(
      {
        reply,
        message: reply,
        content: reply,
        type,
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
    console.error('Fallback chat error:', error)

    return NextResponse.json(
      {
        reply: 'Es gab einen Fehler im Chat-Fallback.',
        message: 'Es gab einen Fehler im Chat-Fallback.',
        error: 'fallback_chat_error',
      },
      { status: 200 }
    )
  }
}