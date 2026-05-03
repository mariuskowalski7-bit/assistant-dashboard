'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboard } from '@/components/dashboard/useDashboard'
import { YouTubePanel } from '@/components/youtube/YouTubePanel'
import { TypeBadge, PriorityChip, Spinner, EmptyState, SectionLabel } from '@/components/ui'
import type { Entry } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

function todayLabel() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function greetingWord() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function fmtTime(time?: string | null) {
  if (!time) return ''
  return time.slice(0, 5)
}

// ── Timeline item ─────────────────────────────────────────────

function TimelineItem({ entry }: { entry: Entry }) {
  const dotColor = entry.type === 'event' ? 'var(--accent2)'
    : entry.type === 'reminder' ? 'var(--amber)' : 'var(--teal)'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '9px 10px', borderRadius: 9, marginBottom: 2,
      transition: 'background .12s', cursor: 'default',
    }}
    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg3)')}
    onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11,
        color: 'var(--text3)', minWidth: 44, paddingTop: 2,
      }}>
        {fmtTime(entry.time) || '——'}
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor, marginTop: 5, flexShrink: 0,
      }}/>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
          {entry.title}
        </div>
        {entry.context && (
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{entry.context}</div>
        )}
      </div>
    </div>
  )
}

// ── Task item ─────────────────────────────────────────────────

function TaskItem({ entry, onDone }: { entry: Entry; onDone: (id: string) => void }) {
  const done = entry.status === 'done'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 10px', borderRadius: 9, marginBottom: 2,
      opacity: done ? .45 : 1, transition: 'all .15s', cursor: 'default',
    }}
    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg3)')}
    onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Checkbox */}
      <div
        onClick={() => !done && onDone(entry.id)}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
          border: done ? 'none' : '1.5px solid var(--border2)',
          background: done ? 'var(--teal)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: done ? 'default' : 'pointer', transition: 'all .15s',
        }}
      >
        {done && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</span>}
      </div>

      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: 13, color: 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {entry.title}
        </span>
        {entry.due_date && !done && (
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontFamily: 'var(--mono)' }}>
            bis {new Date(entry.due_date).toLocaleDateString('de-DE', { day:'2-digit', month:'short' })}
          </span>
        )}
      </div>

      <PriorityChip priority={entry.priority} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function DashboardClient() {
  const { overview, isLoading, refresh, markDone } = useDashboard()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle YouTube OAuth redirect params
  useEffect(() => {
    if (searchParams.get('yt_connected')) {
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  const totalItems = overview
    ? overview.events.length + overview.tasks.length + overview.reminders.length
    : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', height: '100%', overflow: 'hidden' }}>

      {/* ── Main column ───────────────────────────────── */}
      <div style={{ overflow: 'auto', padding: '24px 24px 24px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
            {todayLabel().toUpperCase()}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 0 }}>
            {greetingWord()}!{' '}
            {!isLoading && overview && (
              <span style={{ color: 'var(--accent2)' }}>
                {totalItems === 0 ? 'Nichts anstehend.' : `${totalItems} Einträge heute.`}
              </span>
            )}
          </h1>
        </div>

        {/* Claude insight bar */}
        {!isLoading && overview && overview.overdue.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(245,166,35,.08)',
            border: '1px solid rgba(245,166,35,.25)',
            borderRadius: 11, padding: '10px 14px', marginBottom: 18,
          }}>
            <span style={{ fontSize: 15 }}>⚠️</span>
            <span style={{ fontSize: 12.5, color: 'var(--amber)' }}>
              <strong>{overview.overdue.length} überfällige Aufgabe{overview.overdue.length > 1 ? 'n' : ''}</strong>
              {' '}— jetzt im Chat priorisieren?
            </span>
            <a href="/chat" style={{
              marginLeft: 'auto', fontSize: 11,
              color: 'var(--accent)', fontFamily: 'var(--mono)',
            }}>Chat →</a>
          </div>
        )}

        {/* Stats row */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner size={24} />
          </div>
        ) : overview ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
              {[
                { n: overview.events.length,    label: 'TERMINE HEUTE',  color: 'var(--accent2)' },
                { n: overview.tasks.length,     label: 'OFFENE TASKS',   color: 'var(--teal)'    },
                { n: overview.reminders.length, label: 'ERINNERUNGEN',   color: 'var(--amber)'   },
              ].map(({ n, label, color }) => (
                <div key={label} style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 11, padding: '12px 16px',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1, marginBottom: 4 }}>{n}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <SectionLabel>Heute · Zeitplan</SectionLabel>
            {overview.events.length === 0 && overview.reminders.length === 0 ? (
              <EmptyState icon="📅" title="Keine Termine heute" sub="Über Quick Capture hinzufügen" />
            ) : (
              <div style={{ marginBottom: 24 }}>
                {[...overview.events, ...overview.reminders]
                  .sort((a, b) => (a.time ?? '99:99') > (b.time ?? '99:99') ? 1 : -1)
                  .map(entry => <TimelineItem key={entry.id} entry={entry} />)
                }
              </div>
            )}

            {/* Tasks */}
            <SectionLabel>Aufgaben · Priorisiert</SectionLabel>
            {overview.tasks.length === 0 ? (
              <EmptyState icon="✓" title="Alle Aufgaben erledigt" />
            ) : (
              <div>
                {[...overview.tasks]
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 }
                    return order[a.priority] - order[b.priority]
                  })
                  .map(entry => (
                    <TaskItem key={entry.id} entry={entry} onDone={markDone} />
                  ))
                }
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ── Sidebar ───────────────────────────────────── */}
      <div style={{
        borderLeft: '1px solid var(--border)',
        padding: '24px 16px',
        overflow: 'auto',
        background: 'var(--bg)',
      }}>
        <SectionLabel>Letztes Video</SectionLabel>
        <div style={{ marginBottom: 24 }}>
          <YouTubePanel />
        </div>

        {/* Reminders list */}
        {!isLoading && overview && overview.reminders.length > 0 && (
          <>
            <SectionLabel>Erinnerungen</SectionLabel>
            {overview.reminders.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 8px', borderRadius: 8, marginBottom: 3,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--amber)', flexShrink: 0, marginTop: 5,
                }}/>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>{entry.title}</div>
                  {entry.time && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {fmtTime(entry.time)} Uhr
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Quick links */}
        <div style={{ marginTop: 20 }}>
          <SectionLabel>Schnellzugriff</SectionLabel>
          {[
            { href: '/chat',    label: 'Tag planen →'        },
            { href: '/capture', label: 'Eintrag hinzufügen →' },
            { href: '/chat',    label: 'YouTube-Tipps holen →' },
          ].map(({ href, label }) => (
            <a key={label} href={href} style={{
              display: 'block', padding: '9px 12px',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 9, fontSize: 12.5, color: 'var(--text2)',
              marginBottom: 5, transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text2)'  }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
