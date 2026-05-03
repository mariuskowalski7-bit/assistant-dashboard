'use client'

import type { EntryType, EntryPriority } from '@/types'

// ── Badge ─────────────────────────────────────────────────────

const TYPE_COLORS: Record<EntryType, { bg: string; color: string }> = {
  event:    { bg: 'rgba(124,110,245,.2)',  color: '#a897ff' },
  task:     { bg: 'rgba(62,207,178,.15)', color: '#3ecfb2' },
  reminder: { bg: 'rgba(245,166,35,.15)', color: '#f5a623' },
  note:     { bg: 'rgba(72,187,120,.15)', color: '#48bb78' },
}

const TYPE_LABELS: Record<EntryType, string> = {
  event: 'EVENT', task: 'TASK', reminder: 'REMINDER', note: 'NOTE',
}

export function TypeBadge({ type }: { type: EntryType }) {
  const { bg, color } = TYPE_COLORS[type]
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)',
      letterSpacing: '.03em', background: bg, color, flexShrink: 0,
    }}>
      {TYPE_LABELS[type]}
    </span>
  )
}

// ── Priority dot ──────────────────────────────────────────────

const PRIO_COLORS: Record<EntryPriority, string> = {
  high: 'var(--coral)', medium: 'var(--amber)', low: 'var(--green)',
}
const PRIO_LABELS: Record<EntryPriority, string> = {
  high: 'hoch', medium: 'mittel', low: 'niedrig',
}

export function PriorityChip({ priority }: { priority: EntryPriority }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10.5, fontFamily: 'var(--mono)',
      background: `${PRIO_COLORS[priority]}22`,
      color: PRIO_COLORS[priority],
    }}>
      {PRIO_LABELS[priority]}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border2)" strokeWidth="2.5"/>
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ── Empty state ───────────────────────────────────────────────

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', gap: 8, opacity: .5,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{title}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10.5, color: 'var(--text3)',
      fontFamily: 'var(--mono)', letterSpacing: '.07em',
      textTransform: 'uppercase', marginBottom: 10,
    }}>{children}</p>
  )
}

// ── Page header ───────────────────────────────────────────────

export function PageHeader({ title, sub, action }: {
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '20px 24px 0', marginBottom: 20, flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
          {title}
        </h1>
        {sub && <p style={{ fontSize: 13, color: 'var(--text3)' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}
