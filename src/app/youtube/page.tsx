'use client'

import { useYouTube } from '@/components/youtube/useYouTube'

type AnyData = Record<string, any>

function getFirstVideo(data: unknown): AnyData | null {
  const d = data as AnyData | null | undefined

  if (!d) return null
  if (d.video) return d.video
  if (d.latestVideo) return d.latestVideo
  if (Array.isArray(d.videos) && d.videos.length > 0) return d.videos[0]
  if (Array.isArray(d.items) && d.items.length > 0) return d.items[0]

  return null
}

export default function YouTubePage() {
  const { data, isLoading, error, period, setPeriod } = useYouTube()

  const yt = data as AnyData | null | undefined
  const video = getFirstVideo(data)

  const isConnected = Boolean(yt?.connected)
  const mode = yt?.mode ?? (isConnected ? 'studio' : 'public')
  const connectUrl = '/api/youtube/auth'

  const title =
    video?.title ??
    video?.snippet?.title ??
    'Noch kein Video gefunden'

  const channelTitle =
    video?.channelTitle ??
    video?.snippet?.channelTitle ??
    'YouTube'

  const publishedAt =
    video?.publishedAt ??
    video?.snippet?.publishedAt ??
    null

  const thumbnail =
    video?.thumbnail ??
    video?.thumbnailUrl ??
    video?.snippet?.thumbnails?.high?.url ??
    video?.snippet?.thumbnails?.medium?.url ??
    video?.snippet?.thumbnails?.default?.url ??
    null

  const videoId =
    typeof video?.id === 'string'
      ? video.id
      : video?.id?.videoId ?? video?.videoId ?? null

  const videoUrl =
    video?.url ??
    video?.link ??
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null)

  const stats = video?.statistics ?? yt?.statistics ?? {}

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>YouTube Analytics</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>
            {mode === 'public'
              ? 'Public Mode aktiv – öffentliche YouTube-Daten'
              : 'YouTube Studio verbunden'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['7', '28', '90'].map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value as any)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: String(period) === value ? 'var(--accent)' : 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {value} Tage
            </button>
          ))}
        </div>
      </div>

      {!isConnected && (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(255, 193, 7, 0.08)',
            border: '1px solid rgba(255, 193, 7, 0.25)',
          }}
        >
          <strong>Public Mode aktiv.</strong>
          <p style={{ marginTop: 6, color: 'var(--text-3)' }}>
            Für echte YouTube-Studio-Daten wie CTR, Impressionen und Watchtime kannst du später Google OAuth verbinden.
          </p>
          <a href={connectUrl} style={{ display: 'inline-block', marginTop: 10 }}>
            YouTube Studio später verbinden
          </a>
        </div>
      )}

      {isLoading && (
        <div style={{ marginTop: 24 }}>YouTube-Daten werden geladen...</div>
      )}

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(255, 0, 0, 0.08)',
            color: '#ff6b6b',
          }}
        >
          {String(error)}
        </div>
      )}

      {!isLoading && !video && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 14,
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            Noch keine öffentlichen YouTube-Daten gefunden
          </h2>
          <p style={{ marginTop: 8, color: 'var(--text-3)' }}>
            Trage in Vercel später deine Channel-ID als NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ein.
          </p>
        </div>
      )}

      {video && (
        <section
          style={{
            marginTop: 24,
            padding: 18,
            borderRadius: 18,
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            {thumbnail && (
              <img
                src={thumbnail}
                alt={title}
                style={{
                  width: 220,
                  maxWidth: '40%',
                  borderRadius: 14,
                  objectFit: 'cover',
                }}
              />
            )}

            <div>
              <p style={{ color: 'var(--text-3)', marginBottom: 6 }}>
                {channelTitle}
              </p>

              <h2 style={{ fontSize: 22, fontWeight: 700 }}>
                {title}
              </h2>

              {publishedAt && (
                <p style={{ marginTop: 8, color: 'var(--text-3)' }}>
                  Veröffentlicht: {new Date(publishedAt).toLocaleDateString('de-DE')}
                </p>
              )}

              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 12 }}
                >
                  Video auf YouTube öffnen
                </a>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              marginTop: 22,
            }}
          >
            <StatCard label="Views" value={stats.viewCount ?? stats.views ?? '—'} />
            <StatCard label="Likes" value={stats.likeCount ?? stats.likes ?? '—'} />
            <StatCard label="Kommentare" value={stats.commentCount ?? stats.comments ?? '—'} />
          </div>
        </section>
      )}
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}