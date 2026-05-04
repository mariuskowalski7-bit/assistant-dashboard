import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPublicYouTubeData } from '@/lib/youtube/public'
import { getYouTubeClient } from '@/lib/youtube/client'
import { generateInsights } from '@/lib/youtube/insights'
import type { StudioYouTubeData } from '@/lib/youtube/types'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period       = (searchParams.get('period') ?? '28d') as '7d' | '28d' | '90d'
    const withInsights = searchParams.get('insights') !== 'false'

    const oauthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

    // Fetch token row once – may be null if user never connected OAuth
    const tokenRow = oauthConfigured
      ? (await supabase.from('youtube_tokens').select('channel_id').eq('user_id', user.id).maybeSingle()).data
      : null

    const userHasOAuth = !!tokenRow

    // ── PUBLIC MODE ──────────────────────────────────────────
    // Active when: OAuth not configured, or user hasn't connected yet
    if (!oauthConfigured || !userHasOAuth) {
      // Prefer env channel ID; fall back to stored channel_id if somehow present
      const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? tokenRow?.channel_id

      if (!channelId) {
        return NextResponse.json({
          mode:      'public',
          connected: false,
          message:   'YouTube ist noch nicht verbunden. Bitte Channel-ID eintragen.',
        })
      }

      const publicData = await fetchPublicYouTubeData()
      return NextResponse.json(publicData)
    }

    // ── STUDIO MODE ──────────────────────────────────────────
    // tokenRow is non-null here: userHasOAuth guarantees it
    const ytClient = await getYouTubeClient(user.id, supabase)

    // Resolve channel ID: stored value first, then discover via API
    const channelId = tokenRow.channel_id ?? await ytClient.getChannelId()

    const video     = await ytClient.getLatestVideo(channelId)
    const analytics = await ytClient.getVideoAnalytics(video.id, period)

    let insights = null
    if (withInsights) {
      const cacheKey = `insights:${video.id}:${period}`
      const { data: cached } = await supabase
        .from('youtube_cache')
        .select('data, cached_at')
        .eq('user_id', user.id)
        .eq('cache_key', cacheKey)
        .maybeSingle()

      if (cached && Date.now() - new Date(cached.cached_at).getTime() < 3_600_000) {
        insights = cached.data
      } else {
        insights = await generateInsights(video, analytics.totals, period)
        await supabase.from('youtube_cache').upsert(
          { user_id: user.id, cache_key: cacheKey, data: insights, cached_at: new Date().toISOString() },
          { onConflict: 'user_id,cache_key' }
        )
      }
    }

    const response: StudioYouTubeData = {
      mode:     'studio',
      video,
      totals:   analytics.totals,
      insights,
      cachedAt: new Date().toISOString(),
    }
    return NextResponse.json(response)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/youtube/data]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
