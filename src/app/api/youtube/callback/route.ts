import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCode } from '@/lib/youtube/oauth'
import { getYouTubeClient } from '@/lib/youtube/client'

/**
 * GET /api/youtube/callback
 * Google redirects here after user grants consent.
 * Exchanges the code for tokens and stores them in Supabase.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')   // user.id we passed earlier
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?yt_error=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?yt_error=missing_params`)
  }

  try {
    const supabase = await createClient()

    // Verify the state matches the authenticated user (CSRF check)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(`${appUrl}/dashboard?yt_error=state_mismatch`)
    }

    // Exchange auth code for tokens
    const tokens = await exchangeCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Store tokens (upsert in case of reconnect)
    await supabase
      .from('youtube_tokens')
      .upsert({
        user_id:       user.id,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    expiresAt,
      }, { onConflict: 'user_id' })

    // Immediately fetch and cache the channel ID
    const client = await getYouTubeClient(user.id, supabase)
    await client.getChannelId()

    return NextResponse.redirect(`${appUrl}/dashboard?yt_connected=true`)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/youtube/callback]', msg)
    return NextResponse.redirect(`${appUrl}/dashboard?yt_error=token_exchange_failed`)
  }
}
