import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type PublicVideo = {
  id: string
  title: string
  url: string
  publishedAt: string | null
  thumbnail: string | null
  channelTitle: string | null
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
}

function getTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXml(match[1].trim()) : null
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseYouTubeRss(xml: string): PublicVideo[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []

  return entries.map((entry) => {
    const idRaw = getTagValue(entry, 'yt:videoId') ?? ''
    const title = getTagValue(entry, 'title') ?? 'Untitled'
    const publishedAt = getTagValue(entry, 'published')
    const channelTitle = getTagValue(entry, 'author') ?? null

    const mediaThumbnailMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/i)
    const thumbnail = mediaThumbnailMatch ? mediaThumbnailMatch[1] : null

    return {
      id: idRaw,
      title,
      url: idRaw ? `https://www.youtube.com/watch?v=${idRaw}` : '',
      publishedAt,
      thumbnail,
      channelTitle,
    }
  })
}

async function addPublicStats(videos: PublicVideo[]): Promise<PublicVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey || videos.length === 0) {
    return videos
  }

  const ids = videos.map((video) => video.id).filter(Boolean).join(',')

  if (!ids) {
    return videos
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('part', 'statistics')
    url.searchParams.set('id', ids)
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return videos
    }

    const json = await res.json()

    const statsById = new Map<string, PublicVideo['statistics']>()

    for (const item of json.items ?? []) {
      if (item.id && item.statistics) {
        statsById.set(item.id, item.statistics)
      }
    }

    return videos.map((video) => ({
      ...video,
      statistics: statsById.get(video.id),
    }))
  } catch {
    return videos
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '28'

  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID

  if (!channelId) {
    return NextResponse.json(
      {
        mode: 'public',
        connected: false,
        period,
        message: 'YouTube ist noch nicht verbunden. Bitte NEXT_PUBLIC_YOUTUBE_CHANNEL_ID in Vercel eintragen.',
        videos: [],
        latestVideo: null,
      },
      { status: 200 }
    )
  }

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`

    const rssResponse = await fetch(rssUrl, {
      next: { revalidate: 3600 },
    })

    if (!rssResponse.ok) {
      return NextResponse.json(
        {
          mode: 'public',
          connected: false,
          period,
          message: 'YouTube RSS Feed konnte nicht geladen werden.',
          videos: [],
          latestVideo: null,
        },
        { status: 200 }
      )
    }

    const xml = await rssResponse.text()
    const videosFromRss = parseYouTubeRss(xml)
    const videos = await addPublicStats(videosFromRss)

    return NextResponse.json(
      {
        mode: 'public',
        connected: false,
        period,
        message: 'Public Mode aktiv.',
        videos,
        latestVideo: videos[0] ?? null,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        mode: 'public',
        connected: false,
        period,
        message: 'Öffentliche YouTube-Daten konnten nicht geladen werden.',
        videos: [],
        latestVideo: null,
      },
      { status: 200 }
    )
  }
}