'use client'

import { useEffect, useMemo, useState } from 'react'

type Entry = {
  id: string
  title?: string | null
  type?: 'event' | 'task' | 'reminder' | 'note' | string | null
  status?: string | null
  created_at?: string | null
  date?: string | null
  time?: string | null
  due_at?: string | null
  start_at?: string | null
  source?: string | null
  metadata?: {
    originalInput?: string
    [key: string]: unknown
  } | null
}

type DashboardResponse = {
  ok?: boolean
  entries?: Entry[]
  events?: Entry[]
  tasks?: Entry[]
  reminders?: Entry[]
  notes?: Entry[]
  counts?: {
    total?: number
    events?: number
    tasks?: number
    reminders?: number
    notes?: number
  }
  error?: string | null
}

function getTypeLabel(type?: string | null) {
  if (type === 'event') return 'Termin'
  if (type === 'task') return 'Aufgabe'
  if (type === 'reminder') return 'Erinnerung'
  if (type === 'note') return 'Notiz'
  return 'Eintrag'
}

function getTypeColor(type?: string | null) {
  if (type === 'event') return '#7c5cff'
  if (type === 'task') return '#3ddc97'
  if (type === 'reminder') return '#ffb020'
  if (type === 'note') return '#6ea8fe'
  return '#999'
}

function EntryCard({ entry }: { entry: Entry }) {
  const title =
    entry.title ||
    entry.metadata?.originalInput ||
    'Unbenannter Eintrag'

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.035)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            fontSize: 13,
            color: getTypeColor(entry.type),
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: getTypeColor(entry.type),
            }}
          />
          {getTypeLabel(entry.type)}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700 }}>
          {title}
        </div>

        <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 13 }}>
          Status: {entry.status || 'pending'}
        </div>
      </div>

      {entry.created_at && (
        <div style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {new Date(entry.created_at).toLocaleDateString('de-DE')}
        </div>
      )}
    </div>
  )
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard() {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
      })

      const json = (await res.json()) as DashboardResponse

      setData(json)

      if (!res.ok || json.error) {
        setError(json.error || 'Dashboard-Daten konnten nicht geladen werden.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const entries = useMemo(() => data?.entries ?? [], [data])
  const events = entries.filter((entry) => entry.type === 'event')
  const tasks = entries.filter((entry) => entry.type === 'task')
  const reminders = entries.filter((entry) => entry.type === 'reminder')
  const notes = entries.filter((entry) => entry.type === 'note')

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>
            Deine gespeicherten Termine, Aufgaben, Erinnerungen und Notizen.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          style={{
            height: 42,
            padding: '0 16px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          Aktualisieren
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginTop: 24,
        }}
      >
        <Stat label="Gesamt" value={entries.length} />
        <Stat label="Termine" value={events.length} />
        <Stat label="Aufgaben" value={tasks.length} />
        <Stat label="Erinnerungen" value={reminders.length} />
        <Stat label="Notizen" value={notes.length} />
      </div>

      {isLoading && (
        <div style={{ marginTop: 28, color: 'var(--text-3)' }}>
          Lade Dashboard-Daten...
        </div>
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
          {error}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div
          style={{
            marginTop: 28,
            padding: 20,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.035)',
          }}
        >
          Noch keine Einträge gefunden. Schreibe im Chat z. B.:
          <br />
          <strong>morgen um 14 uhr tennis</strong>
        </div>
      )}

      {entries.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
            Alle Einträge
          </h2>

          <div style={{ display: 'grid', gap: 12 }}>
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.035)',
      }}
    >
      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}