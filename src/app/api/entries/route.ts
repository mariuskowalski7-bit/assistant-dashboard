import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

function getHeaders(key: string) {
  return {
    apikey: key,
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

export async function PATCH(request: Request) {
  const config = getSupabaseConfig()

  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'Supabase URL oder Key fehlt.' },
      { status: 200 }
    )
  }

  try {
    const body = await request.json()
    const id = body?.id
    const status = body?.status

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Entry ID fehlt.' },
        { status: 200 }
      )
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Status fehlt.' },
        { status: 200 }
      )
    }

    const response = await fetch(
      `${config.url}/rest/v1/entries?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: getHeaders(config.key),
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString(),
        }),
      }
    )

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: text || `Update fehlgeschlagen: ${response.status}` },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: true,
      entry: text ? JSON.parse(text) : null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }
    )
  }
}

export async function DELETE(request: Request) {
  const config = getSupabaseConfig()

  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'Supabase URL oder Key fehlt.' },
      { status: 200 }
    )
  }

  try {
    const body = await request.json()
    const id = body?.id

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Entry ID fehlt.' },
        { status: 200 }
      )
    }

    const response = await fetch(
      `${config.url}/rest/v1/entries?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getHeaders(config.key),
      }
    )

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: text || `Löschen fehlgeschlagen: ${response.status}` },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: true,
      deletedId: id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }
    )
  }
}