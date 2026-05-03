'use client'

import { useState, useRef } from 'react'
import { useCapture, classifyLocally } from '@/components/capture/useCapture'
import { TypeBadge, PriorityChip, EmptyState, Spinner } from '@/components/ui'
import type { Entry } from '@/types'

// ── Captured entry row ────────────────────────────────────────

function EntryRow({ entry }: { entry: Entry }) {
  const fmtDate = (d?: string | null) => d
    ? new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'short' })
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: 'var(--bg3)',
      border: '1px solid var(--border)', borderRadius: 10,
      marginBottom: 6, animation: 'slideUp .2s ease',
    }}>
      <TypeBadge type={entry.type} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{entry.title}</div>
        {(entry.date || entry.due_date || entry.context) && (
          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
            {fmtDate(entry.date)}
            {entry.time ? ` · ${entry.time.slice(0,5)}` : ''}
            {fmtDate(entry.due_date) ? ` bis ${fmtDate(entry.due_date)}` : ''}
            {entry.context ? ` · ${entry.context}` : ''}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <PriorityChip priority={entry.priority} />
        {entry.apple_id && (
          <span style={{
            fontSize: 10, color: 'var(--text3)',
            fontFamily: 'var(--mono)', padding: '1px 6px',
            border: '1px solid var(--border)', borderRadius: 99,
          }}>
            ⧉ Apple
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
        {new Date(entry.created_at).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
      </div>
    </div>
  )
}

// ── Type indicator pills ──────────────────────────────────────

const TYPES = ['event','task','reminder','note'] as const
const TYPE_LABELS = { event:'EVENT', task:'TASK', reminder:'REMINDER', note:'NOTE' }

// ── Main ──────────────────────────────────────────────────────

export default function CaptureClient({ recentEntries }: { recentEntries: Entry[] }) {
  const { text, setText, detectedType, isSubmitting, recentEntries: newEntries, submit } = useCapture()
  const [localRecent, setLocalRecent] = useState<Entry[]>(recentEntries)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Merge newly captured entries into the list
  const allRecent = [...newEntries.map(e => ({
    ...e,
    id: crypto.randomUUID(), user_id: '', status: 'pending' as const,
    priority: e.priority ?? 'medium' as const,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as Entry)), ...localRecent].slice(0, 15)

  async function handleSubmit() {
    await submit()
    textareaRef.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const liveType = classifyLocally(text)

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Quick Capture</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Schreib einfach – Claude erkennt automatisch den Typ.
          </p>
        </div>

        {/* Live classification preview */}
        {text.trim() && liveType && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 9,
            background: 'var(--bg4)', border: '1px solid var(--border2)',
            marginBottom: 10, animation: 'fadeIn .15s ease',
          }}>
            <TypeBadge type={liveType} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>erkannt · Claude bestätigt beim Speichern</span>
          </div>
        )}

        {/* Capture box */}
        <div style={{
          background: 'var(--bg3)',
          border: `1px solid ${text.trim() ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 16, padding: 16,
          boxShadow: text.trim() ? '0 0 0 3px var(--accent-glow)' : 'none',
          transition: 'all .2s', marginBottom: 20,
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              '„Morgen 10 Uhr Meeting mit Jan"\n' +
              '„Steuer bis Freitag erledigen"\n' +
              '„Ich esse kein Gluten"\n' +
              '„Heute Abend Sport nicht vergessen"'
            }
            autoFocus
            style={{
              width: '100%', minHeight: 96, background: 'transparent',
              border: 'none', outline: 'none', color: 'var(--text)',
              fontSize: 15, lineHeight: 1.65, resize: 'none',
              fontFamily: 'var(--font)',
            }}
          />

          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8,
          }}>
            {/* Type pills */}
            <div style={{ display: 'flex', gap: 5 }}>
              {TYPES.map(t => (
                <span
                  key={t}
                  style={{
                    padding: '3px 10px', borderRadius: 99,
                    fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
                    opacity: liveType === t ? 1 : .25,
                    border: `1px solid ${liveType === t ? 'currentColor' : 'transparent'}`,
                    color: t === 'event' ? 'var(--accent2)'
                      : t === 'task' ? 'var(--teal)'
                      : t === 'reminder' ? 'var(--amber)'
                      : 'var(--green)',
                    transition: 'opacity .15s',
                  }}
                >
                  {TYPE_LABELS[t]}
                </span>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                background: text.trim() && !isSubmitting ? 'var(--accent)' : 'var(--bg4)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 500,
                transition: 'all .15s',
                opacity: !text.trim() ? .4 : 1,
              }}
            >
              {isSubmitting ? <><Spinner size={13} /> Speichern…</> : 'Speichern ↵'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 24, fontFamily: 'var(--mono)' }}>
          ⌘↵ zum Speichern · Claude klassifiziert automatisch · Apple Sync falls konfiguriert
        </p>

        {/* Recent entries */}
        <div style={{
          fontSize: 10.5, color: 'var(--text3)',
          fontFamily: 'var(--mono)', letterSpacing: '.07em',
          marginBottom: 10,
        }}>
          ZULETZT ERFASST
        </div>

        {allRecent.length === 0 ? (
          <EmptyState icon="⊕" title="Noch keine Einträge" sub="Schreib deinen ersten Eintrag oben" />
        ) : (
          allRecent.map((entry, i) => <EntryRow key={entry.id ?? i} entry={entry} />)
        )}
      </div>
    </div>
  )
}
