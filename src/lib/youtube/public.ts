/**
 * public.ts
 * Fetches public YouTube data without any OAuth.
 *
 * Data sources (in order of priority):
 *   1. YouTube RSS feed  → always available, no key needed
 *   2. YouTube Data API v3 (videos.list) → enriches with stats/duration
 *      Only used when YOUTUBE_API_KEY is set.
 *
 * Required env:  NEXT_PUBLIC_YOUTUBE_CHANNEL_ID
 * Optional env:  YOUTUBE_API_KEY
 */

import type { PublicVideo, PublicYouTubeData } from './types'

const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml'
const DATA_API = 'https://www.googleapis.com/youtube/v3'

// ── RSS parsing ───────────────────────────────────────────────

interface RssEntry {
  id: string
  title: string
  publishedAt: string
  thumbnail: string
  videoUrl: string
  channelTitle: string
}

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*>`))
  return m ? m[1] : ''
}

function parseFeed(xml: string): RssEntry[] {
  // Split on <entry> blocks
  const entries: RssEntry[] = []
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []

  for (const block of blocks) {
    // yt:videoId
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    if (!idMatch) continue
    const videoId = idMatch[1]

    const title = extractText(block, 'title')
    const published = extractText(block, 'published')
    const channelTitle = extractText(block, 'name')

    // media:thumbnail url attribute
    const thumbnail =
      extractAttr(block, 'media:thumbnail', 'url') ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    entries.push({
      id: videoId,
      title,
      publishedAt: published,
      thumbnail,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelTitle,
    })
  }

  return entries
}

async function fetchRss(channelId: string): Promise<RssEntry[]> {
  const url = `${RSS_BASE}?channel_id=${channelId}`
  const res = await fetch(url, {
    next: { revalidate: 300 }, // Next.js cache: 5 minutes
  })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  const xml = await res.text()
  return parseFeed(xml).slice(0, 5) // latest 5
}

// ── Optional Data API enrichment ──────────────────────────────

interface ApiStats {
  viewCount: string
  likeCount: string
  commentCount: string
}
interface ApiDetails {
  duration: string
}
interface EnrichedData {
  stats: Record<string, ApiStats>
  details: Record<string, ApiDetails>
}

async function enrichWithApiKey(
  videoIds: string[],
  apiKey: string
): Promise<EnrichedData> {
  const ids = videoIds.join(',')
  const url = `${DATA_API}/videos?part=statistics,contentDetails&id=${ids}&key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    console.warn('[YouTube public] Data API enrichment failed:', res.status)
    return { stats: {}, details: {} }
  }

  const data = await res.json()
  const stats: Record<string, ApiStats> = {}
  const details: Record<string, ApiDetails> = {}

  for (const item of data.items ?? []) {
    stats[item.id] = item.statistics
    details[item.id] = item.contentDetails
  }

  return { stats, details }
}

// ── Main export ───────────────────────────────────────────────

export async function fetchPublicYouTubeData(): Promise<PublicYouTubeData> {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID
  if (!channelId) {
    throw new Error('NEXT_PUBLIC_YOUTUBE_CHANNEL_ID is not set')
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  const oauthAvailable = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  // 1. Fetch RSS (always)
  const rssEntries = await fetchRss(channelId)

  // 2. Optionally enrich with Data API
  let enriched: EnrichedData = { stats: {}, details: {} }
  if (apiKey && rssEntries.length > 0) {
    enriched = await enrichWithApiKey(rssEntries.map(e => e.id), apiKey)
  }

  // 3. Merge
  const videos: PublicVideo[] = rssEntries.map(entry => {
    const s = enriched.stats[entry.id]
    const d = enriched.details[entry.id]
    return {
      id:           entry.id,
      title:        entry.title,
      publishedAt:  entry.publishedAt,
      thumbnail:    entry.thumbnail,
      videoUrl:     entry.videoUrl,
      channelTitle: entry.channelTitle,
      viewCount:    s?.viewCount,
      likeCount:    s?.likeCount,
      commentCount: s?.commentCount,
      duration:     d?.duration,
    }
  })

  return {
    mode:           'public',
    channelId,
    videos,
    oauthAvailable,
    cachedAt:       new Date().toISOString(),
  }
}

// ── Mode detection helper (used by the API route) ─────────────

export function getYouTubeMode(): 'studio' | 'public' {
  // Studio mode requires OAuth credentials
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return 'studio'
  }
  return 'public'
}
