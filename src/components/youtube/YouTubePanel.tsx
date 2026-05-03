'use client'

import { useState } from 'react'
import { useYouTube } from './useYouTube'
import type { DashboardYouTubeData, AnalyticsRow } from '@/lib/youtube/types'

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

// ── Spark bar chart (pure CSS, no library) ───────────────────

function SparkBar({ rows, metric }: {
  rows: AnalyticsRow[]
  metric: keyof AnalyticsRow
}) {
  const values = rows.map(r => Number(r[metric]))
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${rows[i].date}: ${v}`}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: 'var(--accent)',
            opacity: 0.6 + (v / max) * 0.4,
            borderRadius: 2,
            minWidth: 2,
          }}
        />
      ))}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight }: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      border: `1px solid ${highlight ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 22,
        fontWeight: 600,
        color: highlight ? 'var(--color-text-info)' : 'var(--color-text-primary)',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Dashboard Widget (compact) ────────────────────────────────

export function YouTubeWidget({ onExpand }: { onExpand: () => void }) {
  const { data, isLoading, isConnected, connectUrl } = useYouTube()

  if (!isConnected) {
    return (
      <div style={{
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
          YouTube nicht verbunden
        </div>
        <a
          href={connectUrl}
          style={{
            display: 'inline-block',
            padding: '7px 16px',
            background: '#ff0000',
            color: '#fff',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Mit YouTube verbinden
        </a>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div style={{
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 12,
        overflow: 'hidden',
        opacity: 0.5,
      }}>
        <div style={{ height: 100, background: 'var(--color-background-secondary)' }} />
        <div style={{ padding: '10px 12px' }}>
          <div style={{ height: 12, background: 'var(--color-background-tertiary)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: 32, background: 'var(--color-background-tertiary)', borderRadius: 4 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { video, totals } = data
  const thumb = video.snippet.thumbnails.maxres ?? video.snippet.thumbnails.high

  return (
    <div
      style={{
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color .15s',
      }}
      onClick={onExpand}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
        <img
          src={thumb.url}
          alt={video.snippet.title}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        />
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          background: 'rgba(0,0,0,.85)',
          color: '#fff', fontSize: 11, fontFamily: 'monospace',
          padding: '2px 6px', borderRadius: 4,
        }}>
          {video.contentDetails.duration.replace('PT','').replace('M',':').replace('S','')}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: 8, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {video.snippet.title}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            <strong style={{ color: 'var(--color-text-primary)', fontSize: 13, display: 'block' }}>
              {fmt(totals.views)}
            </strong>Views
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            <strong style={{
              color: totals.ctr >= 6 ? 'var(--color-text-success)' : 'var(--color-text-primary)',
              fontSize: 13, display: 'block',
            }}>
              {totals.ctr.toFixed(1)}%{totals.ctr >= 6 ? ' ↑' : ''}
            </strong>CTR
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            <strong style={{ color: 'var(--color-text-primary)', fontSize: 13, display: 'block' }}>
              {fmtDuration(totals.averageViewDuration)}
            </strong>Watchtime Ø
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            <strong style={{ color: 'var(--color-text-primary)', fontSize: 13, display: 'block' }}>
              {fmt(totals.likes)}
            </strong>Likes
          </div>
        </div>
        <div style={{
          marginTop: 8, fontSize: 11, color: 'var(--color-text-tertiary)',
          textAlign: 'right', fontFamily: 'monospace',
        }}>
          Details ansehen ↗
        </div>
      </div>
    </div>
  )
}

// ── Detail View (full analytics) ─────────────────────────────

export function YouTubeDetail({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isConnected, error, period, setPeriod } = useYouTube()

  const periods: Array<{ value: '7d' | '28d' | '90d'; label: string }> = [
    { value: '7d', label: '7 Tage' },
    { value: '28d', label: '28 Tage' },
    { value: '90d', label: '90 Tage' },
  ]

  if (!isConnected) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 16,
    }}
    onClick={onClose}>
      <div
        style={{
          background: 'var(--color-background-primary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 16,
          width: '100%', maxWidth: 680,
          maxHeight: '90vh', overflow: 'auto',
          padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              YouTube Analytics
            </div>
            {data && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {data.video.snippet.channelTitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Period switcher */}
            <div style={{ display: 'flex', gap: 4 }}>
              {periods.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    border: '1px solid var(--color-border-secondary)',
                    background: period === p.value ? 'var(--color-background-info)' : 'transparent',
                    color: period === p.value ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 8, width: 30, height: 30,
                cursor: 'pointer', fontSize: 16,
                color: 'var(--color-text-secondary)',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
            Daten werden geladen…
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--color-background-error)',
            color: 'var(--color-text-error)', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {data && !isLoading && (() => {
          const { video, totals, insights } = data

          return (
            <>
              {/* Video title */}
              <div style={{
                fontSize: 14, fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: 16, lineHeight: 1.5,
              }}>
                {video.snippet.title}
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 8, fontFamily: 'monospace' }}>
                  {fmtDate(video.snippet.publishedAt)}
                </span>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                <StatCard label="VIEWS" value={fmt(totals.views)} />
                <StatCard label="CTR" value={`${totals.ctr.toFixed(1)}%`} highlight={totals.ctr >= 6} />
                <StatCard label="WATCHTIME Ø" value={fmtDuration(totals.averageViewDuration)} />
                <StatCard label="WIEDERGABE %" value={`${totals.averageViewPercentage.toFixed(0)}%`} highlight={totals.averageViewPercentage >= 40} />
                <StatCard label="IMPRESSIONEN" value={fmt(totals.impressions)} />
                <StatCard label="LIKES" value={fmt(totals.likes)} />
                <StatCard label="KOMMENTARE" value={fmt(totals.comments)} />
                <StatCard label="ABONNENTEN +" value={`+${totals.subscribersGained}`} />
              </div>

              {/* Spark chart */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace', marginBottom: 8 }}>
                  VIEWS PRO TAG
                </div>
                <SparkBar rows={data.totals ? [] : []} metric="views" />
              </div>

              {/* Claude Insights */}
              {insights && (
                <div style={{
                  background: 'var(--color-background-info)',
                  border: '1px solid var(--color-border-info)',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{
                    fontSize: 11, fontFamily: 'monospace',
                    color: 'var(--color-text-info)', marginBottom: 10,
                    letterSpacing: '.06em',
                  }}>
                    ◎ CLAUDE INSIGHTS
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 12, lineHeight: 1.6 }}>
                    {insights.summary}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-success)', fontFamily: 'monospace', marginBottom: 6 }}>
                        ✓ STÄRKEN
                      </div>
                      {insights.strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                          · {s}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-warning)', fontFamily: 'monospace', marginBottom: 6 }}>
                        ↑ VERBESSERUNGEN
                      </div>
                      {insights.improvements.map((s, i) => (
                        <div key={i} style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                          · {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--color-background-primary)',
                    borderRadius: 8, padding: '10px 12px',
                    fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5,
                  }}>
                    <span style={{ color: 'var(--color-text-info)', fontWeight: 500 }}>Empfehlung: </span>
                    {insights.suggestion}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ── Combined export with open/close state ─────────────────────

export function YouTubePanel() {
  const [detailOpen, setDetailOpen] = useState(false)
  return (
    <>
      <YouTubeWidget onExpand={() => setDetailOpen(true)} />
      {detailOpen && <YouTubeDetail onClose={() => setDetailOpen(false)} />}
    </>
  )
}
