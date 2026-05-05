import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeSupabaseUrl(rawUrl?: string) {
  if (!rawUrl) return null

  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '')
}

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const url = normalizeSupabaseUrl(rawUrl)

  const debug = {
    hasRawUrl: Boolean(rawUrl),
    normalizedUrl: url,
    hasAnonKey: Boolean(anonKey),
    hasServiceKey: Boolean(serviceKey),
    serviceKeyType: serviceKey?.startsWith('sb_secret_')
      ? 'sb_secret'
      : serviceKey?.startsWith('eyJ')
        ? 'jwt'
        : serviceKey
          ? 'unknown'
          : 'missing',
  }

  if (!url) {
    return NextResponse.json({
      ok: false,
      debug,
      error: 'NEXT_PUBLIC_SUPABASE_URL fehlt.',
    })
  }

  const key = serviceKey || anonKey

  if (!key) {
    return NextResponse.json({
      ok: false,
      debug,
      error: 'Kein Supabase Key vorhanden.',
    })
  }

  try {
    const response = await fetch(`${url}/rest/v1/entries?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: key,
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
      },
    })

    const text = await response.text()

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      debug,
      response: text.slice(0, 500),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      debug,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCause:
        error instanceof Error && 'cause' in error
          ? String((error as any).cause)
          : null,
    })
  }
}