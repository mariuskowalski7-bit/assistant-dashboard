import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getYouTubeClient } from '@/lib/youtube/client'
import { generateInsights } from '@/lib/youtube/insights'
import type { DashboardYouTubeData } from '@/lib/youtube/types'

/**
 * GET /api/youtube/data?period=28d&insights=true
 *
 * Returns: latest video + analytics + (optionally) Claude insights.
 * All data is cached in Supabase to protect YouTube API quota.
 *
 * Query params:
 *   period   = '7d' | '28d' | '90d'  (default: '28d')
 *   insights = 'true' | 'false'       (default: 'true', adds ~1s latency)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period    = (searchParams.get('period') ?? '28d') as '7d' | '28d' | '90d'
    const withInsights = searchParams.get('insights') !== 'false'

    // Check if YouTube is connected
    const { data: tokenRow } = await supabase
      .from('youtube_tokens')
      .select('channel_id, channel_title')
      .eq('user_id', user.id)
      .single()

    if (!tokenRow) {
      return NextResponse.json({
        error: 'youtube_not_connected',
        message: 'Visit /api/youtube/auth to connect your YouTube account.',
      }, { status: 403 })
    }

    const client = await getYouTubeClient(user.id, supabase)

    // Ensure we have a channel ID
    const channelId = tokenRow.channel_id ?? await client.getChannelId()

    // Fetch video + analytics (analytics is internally cached 15 min)
    const [video, analytics] = await Promise.all([
      client.getLatestVideo(channelId),
      client.getVideoAnalytics('', period).catch(() => null),  // analytics may need videoId
    ])

    // Fetch analytics with correct video ID
    const videoAnalytics = await client.getVideoAnalytics(video.id, period)

    // Optionally generate Claude insights (adds ~1s)
    let insights = null
    if (withInsights) {
      // Check insights cache (1 hour TTL – insights don't need to be real-time)
      const insightsCacheKey = `insights:${video.id}:${period}`
      const { data: cachedInsights } = await supabase
        .from('youtube_cache')
        .select('data, cached_at')
        .eq('user_id', user.id)
        .eq('cache_key', insightsCacheKey)
        .single()

      const insightsTtl = 60 * 60 * 1000 // 1 hour
      if (cachedInsights && Date.now() - new Date(cachedInsights.cached_at).getTime() < insightsTtl) {
        insights = cachedInsights.data
      } else {
        insights = await generateInsights(video, videoAnalytics.totals, period)
        await supabase.from('youtube_cache').upsert({
          user_id:   user.id,
          cache_key: insightsCacheKey,
          data:      insights,
          cached_at: new Date().toISOString(),
        }, { onConflict: 'user_id,cache_key' })
      }
    }

    const response: DashboardYouTubeData = {
      video,
      totals:    videoAnalytics.totals,
      insights,
      cachedAt:  new Date().toISOString(),
    }

    return NextResponse.json(response)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/youtube/data]', msg)

    if (msg.includes('not connected')) {
      return NextResponse.json({
        error: 'youtube_not_connected',
        message: msg,
      }, { status: 403 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
