'use client'

import { useState, useCallback } from 'react'
import type { EntryType, CreateEntryPayload, ExtractedEntry } from '@/types'

// ── Local heuristic classifier (instant feedback, no API call) ──
// Claude does the authoritative classification server-side,
// but we preview it locally so the UI feels instant.
const RULES: Array<{ type: EntryType; keywords: string[] }> = [
  {
    type: 'event',
    keywords: ['uhr', 'morgen', 'übermorgen', 'nächste woche', 'montag',
               'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag',
               'sonntag', 'meeting', 'termin', 'treffen', 'konferenz'],
  },
  {
    type: 'reminder',
    keywords: ['vergessen', 'nicht vergessen', 'erinner', 'erinnere',
               'abends', 'heute abend', 'morgen früh', 'reminder'],
  },
  {
    type: 'task',
    keywords: ['erledigen', 'fertig', 'bis ', 'deadline', 'aufgabe',
               'task', 'muss', 'sollte', 'abgabe', 'fertigstellen'],
  },
  {
    type: 'note',
    keywords: ['bevorzuge', 'mag ', 'ich bin', 'ich habe', 'notiz',
               'präferenz', 'info', 'wissens', 'liebe ', 'esse '],
  },
]

export function classifyLocally(text: string): EntryType | null {
  const lower = text.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.type
  }
  return null
}

// ────────────────────────────────────────────────────────────

interface UseCaptureReturn {
  text: string
  setText: (v: string) => void
  detectedType: EntryType | null
  isSubmitting: boolean
  recentEntries: ExtractedEntry[]
  submit: () => Promise<void>
}

export function useCapture(): UseCaptureReturn {
  const [text, setText_] = useState('')
  const [detectedType, setDetectedType] = useState<EntryType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentEntries, setRecentEntries] = useState<ExtractedEntry[]>([])

  const setText = useCallback((v: string) => {
    setText_(v)
    setDetectedType(classifyLocally(v))
  }, [])

  const submit = useCallback(async () => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      // Use the chat endpoint: it classifies + persists in one call
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: [] }),
      })

      if (!res.ok) throw new Error(await res.text())

      const { extracted } = await res.json()

      if (extracted) {
        setRecentEntries(prev => [extracted, ...prev.slice(0, 9)])
      }

      setText_('')
      setDetectedType(null)

    } catch (err) {
      console.error('[useCapture]', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [text, isSubmitting])

  return { text, setText, detectedType, isSubmitting, recentEntries, submit }
}
