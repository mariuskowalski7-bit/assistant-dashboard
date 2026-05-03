import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/youtube/oauth'

/**
 * GET /api/youtube/auth
 * Redirects the user to Google's OAuth consent screen.
 * The user's ID is passed as `state` for CSRF protection.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already connected
    const { data: existing } = await supabase
      .from('youtube_tokens')
      .select('channel_title, expires_at')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        status: 'already_connected',
        channel: existing.channel_title,
        message: 'YouTube already connected. Visit /api/youtube/auth?force=true to reconnect.',
      })
    }

    const authUrl = buildAuthUrl(user.id)  // user.id as CSRF state
    return NextResponse.redirect(authUrl)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/youtube/auth]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
