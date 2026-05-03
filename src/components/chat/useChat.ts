'use client'

import { useState, useCallback } from 'react'
import type { ChatMessage, ExtractedEntry } from '@/types'

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  send: (text: string) => Promise<void>
  lastExtracted: ExtractedEntry | null
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastExtracted, setLastExtracted] = useState<ExtractedEntry | null>(null)

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return

    // Optimistic: add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Build history for Claude context (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.ok) throw new Error(await res.text())

      const { reply, extracted } = await res.json()

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: '',
        role: 'assistant',
        content: reply,
        extracted,
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMsg])
      setLastExtracted(extracted ?? null)

    } catch (err) {
      console.error('[useChat]', err)
      // Add error message so UI doesn't go silent
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        user_id: '',
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return { messages, isLoading, send, lastExtracted }
}
