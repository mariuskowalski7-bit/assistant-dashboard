/**
 * client.ts
 * YouTube Data API v3 + YouTube Analytics API wrapper.
 * Handles token refresh + Supabase caching automatically.
 *
 * Cache TTL: 15 minutes for analytics (quota-sensitive),
 *            5 minutes for video metadata.
 */

import { refreshAccessToken, isExpired } from './oauth'
import type {
  Video, VideoAnalytics, AnalyticsRow, AnalyticsTotals, YouTubeTokens,
} from './types'

const DATA_API    = 'https://www.googleapis.com/youtube/v3'
const ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2'

const CACHE_TTL_ANALYTICS = 15 * 60 * 1000   // 15 min
const CACHE_TTL_VIDEO     =  5 * 60 * 1000   //  5 min

// ── Token manager (per-request, loaded from Supabase) ────────

export class YouTubeClient {
  private accessToken: string
  private refreshToken: string
  private expiresAt: string
  private userId: string
  private supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

  constructor(
    tokens: YouTubeTokens,
    userId: string,
    supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
  ) {
    this.accessToken  = tokens.access_token
    this.refreshToken = tokens.refresh_token
    this.expiresAt    = tokens.expires_at
    this.userId       = userId
    this.supabase     = supabase
  }

  // ── Ensure token is fresh before every API call ─────────────
  private async ensureFreshToken(): Promise<void> {
    if (!isExpired(this.expiresAt)) return

    const { access_token, expires_at } = await refreshAccessToken(this.refreshToken)
    this.accessToken = access_token
    this.expiresAt   = expires_at

    // Persist refreshed token
    await this.supabase
      .from('youtube_tokens')
      .update({ access_token, expires_at })
      .eq('user_id', this.userId)
  }

  private async get(baseUrl: string, params: Record<string, string>): Promise<Response> {
    await this.ensureFreshToken()
    const url = `${baseUrl}?${new URLSearchParams(params)}`
    return fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
  }

  // ── Cache helpers ────────────────────────────────────────────

  private async getCached<T>(key: string, ttlMs: number): Promise<T | null> {
    const { data } = await this.supabase
      .from('youtube_cache')
      .select('data, cached_at')
      .eq('user_id', this.userId)
      .eq('cache_key', key)
      .single()

    if (!data) return null
    if (Date.now() - new Date(data.cached_at).getTime() > ttlMs) return null
    return data.data as T
  }

  private async setCache(key: string, data: unknown): Promise<void> {
    await this.supabase
      .from('youtube_cache')
      .upsert(
        { user_id: this.userId, cache_key: key, data, cached_at: new Date().toISOString() },
        { onConflict: 'user_id,cache_key' }
      )
  }

  // ── Fetch my channel ID ──────────────────────────────────────

  async getChannelId(): Promise<string> {
    const res = await this.get(`${DATA_API}/channels`, {
      part: 'id,snippet',
      mine: 'true',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`YouTube channels API: ${data.error?.message}`)
    const channelId = data.items?.[0]?.id
    if (!channelId) throw new Error('No YouTube channel found for this account')

    // Cache channel_id in tokens table
    await this.supabase
      .from('youtube_tokens')
      .update({
        channel_id:    channelId,
        channel_title: data.items[0].snippet.title,
      })
      .eq('user_id', this.userId)

    return channelId
  }

  // ── Fetch the latest uploaded video ─────────────────────────

  async getLatestVideo(channelId: string): Promise<Video> {
    const cacheKey = `latest_video:${channelId}`
    const cached = await this.getCached<Video>(cacheKey, CACHE_TTL_VIDEO)
    if (cached) return cached

    // Step 1: Get latest video ID from channel uploads playlist
    const channelRes = await this.get(`${DATA_API}/channels`, {
      part: 'contentDetails',
      id:   channelId,
    })
    const channelData = await channelRes.json()
    if (!channelRes.ok) throw new Error(`YouTube channels API: ${channelData.error?.message}`)

    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) throw new Error('Could not find uploads playlist')

    // Step 2: Get most recent video from uploads playlist
    const playlistRes = await this.get(`${DATA_API}/playlistItems`, {
      part:       'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: '1',
    })
    const playlistData = await playlistRes.json()
    if (!playlistRes.ok) throw new Error(`YouTube playlistItems API: ${playlistData.error?.message}`)

    const videoId = playlistData.items?.[0]?.contentDetails?.videoId
    if (!videoId) throw new Error('No videos found in uploads playlist')

    // Step 3: Get full video details
    const videoRes = await this.get(`${DATA_API}/videos`, {
      part: 'snippet,statistics,contentDetails',
      id:   videoId,
    })
    const videoData = await videoRes.json()
    if (!videoRes.ok) throw new Error(`YouTube videos API: ${videoData.error?.message}`)

    const video = videoData.items?.[0] as Video
    if (!video) throw new Error('Video details not found')

    await this.setCache(cacheKey, video)
    return video
  }

  // ── Fetch Analytics for a video ──────────────────────────────

  async getVideoAnalytics(videoId: string, period: '7d' | '28d' | '90d' = '28d'): Promise<VideoAnalytics> {
    const cacheKey = `analytics:${videoId}:${period}`
    const cached = await this.getCached<VideoAnalytics>(cacheKey, CACHE_TTL_ANALYTICS)
    if (cached) return cached

    const days = period === '7d' ? 7 : period === '28d' ? 28 : 90
    const endDate   = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]

    const res = await this.get(`${ANALYTICS_API}/reports`, {
      ids:        'channel==MINE',
      startDate,
      endDate,
      dimensions: 'day',
      metrics:    [
        'views',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'averageViewPercentage',
        'impressions',
        'impressionClickThroughRate',
        'likes',
        'comments',
        'subscribersGained',
      ].join(','),
      filters:    `video==${videoId}`,
      sort:       'day',
    })

    const data = await res.json()

    // Analytics API returns 403 if the channel has no analytics permission yet
    if (res.status === 403) {
      throw new Error(
        'YouTube Analytics API access denied. ' +
        'Ensure "YouTube Analytics API" is enabled in Google Cloud Console ' +
        'and the OAuth consent screen is configured correctly.'
      )
    }
    if (!res.ok) throw new Error(`YouTube Analytics API: ${data.error?.message}`)

    // Map column headers to typed rows
    const headers: string[] = data.columnHeaders?.map((h: { name: string }) => h.name) ?? []
    const rows: AnalyticsRow[] = (data.rows ?? []).map((row: number[]) => {
      const obj: Record<string, string | number> = {}
      headers.forEach((h, i) => { obj[h] = row[i] })
      return {
        date:                       String(obj.day ?? ''),
        views:                      Number(obj.views ?? 0),
        estimatedMinutesWatched:    Number(obj.estimatedMinutesWatched ?? 0),
        averageViewDuration:        Number(obj.averageViewDuration ?? 0),
        averageViewPercentage:      Number(obj.averageViewPercentage ?? 0),
        impressions:                Number(obj.impressions ?? 0),
        impressionClickThroughRate: Number(obj.impressionClickThroughRate ?? 0),
        likes:                      Number(obj.likes ?? 0),
        comments:                   Number(obj.comments ?? 0),
        subscribersGained:          Number(obj.subscribersGained ?? 0),
      } as AnalyticsRow
    })

    // Compute totals
    const sum = (key: keyof AnalyticsRow) =>
      rows.reduce((acc, r) => acc + (r[key] as number), 0)

    const totals: AnalyticsTotals = {
      views:                   sum('views'),
      estimatedMinutesWatched: sum('estimatedMinutesWatched'),
      averageViewDuration:     rows.length ? sum('averageViewDuration') / rows.length : 0,
      averageViewPercentage:   rows.length ? sum('averageViewPercentage') / rows.length : 0,
      impressions:             sum('impressions'),
      ctr:                     rows.length ? sum('impressionClickThroughRate') / rows.length : 0,
      likes:                   sum('likes'),
      comments:                sum('comments'),
      subscribersGained:       sum('subscribersGained'),
    }

    const result: VideoAnalytics = { videoId, period, rows, totals }
    await this.setCache(cacheKey, result)
    return result
  }
}

// ── Factory: load tokens from DB and return a ready client ───

export async function getYouTubeClient(
  userId: string,
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<YouTubeClient> {
  const { data, error } = await supabase
    .from('youtube_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('YouTube not connected. Visit /api/youtube/auth to connect.')
  }

  return new YouTubeClient(data as YouTubeTokens, userId, supabase)
}
