// ── YouTube mode ──────────────────────────────────────────────
// public  = RSS feed + optional Data API key (no OAuth required)
// studio  = authenticated via Google OAuth (CTR, impressions, etc.)
export type YouTubeMode = 'public' | 'studio'

// ── Public mode: video card from RSS (+ optional API enrichment) ──
export interface PublicVideo {
  id: string
  title: string
  publishedAt: string
  thumbnail: string        // best available thumbnail URL
  videoUrl: string         // https://youtube.com/watch?v=ID
  channelTitle: string
  // Present only when YOUTUBE_API_KEY is set:
  viewCount?: string
  likeCount?: string
  commentCount?: string
  duration?: string        // ISO 8601 e.g. 'PT8M24S'
}

export interface PublicYouTubeData {
  mode: 'public'
  channelId: string
  videos: PublicVideo[]    // up to 5 latest
  oauthAvailable: boolean  // true when GOOGLE_CLIENT_ID is set → show "Connect" button
  cachedAt: string
}

// ── YouTube API response shapes ───────────────────────────────

export interface YouTubeTokens {
  access_token: string
  refresh_token: string
  expires_at: string   // ISO timestamptz
  channel_id?: string
  channel_title?: string
}

export interface VideoSnippet {
  title: string
  description: string
  publishedAt: string
  thumbnails: {
    high: { url: string; width: number; height: number }
    maxres?: { url: string; width: number; height: number }
  }
  channelTitle: string
  tags?: string[]
}

export interface VideoStatistics {
  viewCount: string
  likeCount: string
  commentCount: string
  favoriteCount: string
}

export interface VideoContentDetails {
  duration: string          // ISO 8601: 'PT8M24S'
  definition: 'hd' | 'sd'
}

export interface Video {
  id: string
  snippet: VideoSnippet
  statistics: VideoStatistics
  contentDetails: VideoContentDetails
}

// Analytics from YouTube Analytics API
export interface VideoAnalytics {
  videoId: string
  period: '7d' | '28d' | '90d'
  rows: AnalyticsRow[]
  totals: AnalyticsTotals
}

export interface AnalyticsRow {
  date: string
  views: number
  estimatedMinutesWatched: number
  averageViewDuration: number     // seconds
  averageViewPercentage: number   // 0-100
  impressions: number
  impressionClickThroughRate: number  // 0-100
  likes: number
  comments: number
  subscribersGained: number
}

export interface AnalyticsTotals {
  views: number
  estimatedMinutesWatched: number
  averageViewDuration: number
  averageViewPercentage: number
  impressions: number
  ctr: number
  likes: number
  comments: number
  subscribersGained: number
}

// What we return to the client
export interface LatestVideoData {
  video: Video
  analytics: VideoAnalytics
  cachedAt: string
}

export interface ClaudeInsights {
  summary: string
  strengths: string[]
  improvements: string[]
  suggestion: string
}

// Studio mode response (OAuth connected)
export interface StudioYouTubeData {
  mode: 'studio'
  video: Video
  totals: AnalyticsTotals
  insights: ClaudeInsights | null
  cachedAt: string
}

// Union – what /api/youtube/data always returns
export type DashboardYouTubeData = PublicYouTubeData | StudioYouTubeData
