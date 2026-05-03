'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/components/chat/useChat'
import { TypeBadge, Spinner } from '@/components/ui'
import type { ChatMessage, ExtractedEntry } from '@/types'

// ── Classified entry card shown inline in Claude's message ────

function ExtractedCard({ entry }: { entry: ExtractedEntry }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'var(--bg4)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: '10px 12px', marginTop: 8,
    }}>
      <TypeBadge type={entry.type} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
          {entry.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {entry.date && `${new Date(entry.date).toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'short' })}`}
          {entry.time && ` · ${entry.time}`}
          {entry.due_date && ` · bis ${new Date(entry.due_date).toLocaleDateString('de-DE', { day:'2-digit', month:'short' })}`}
          {entry.priority && ` · ${entry.priority}`}
          {entry.context && ` · ${entry.context}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
          ✓ Gespeichert & synchronisiert
        </div>
      </div>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'slideUp .2s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isUser
          ? 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)'
          : 'var(--bg4)',
        border: isUser ? 'none' : '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, color: isUser ? '#fff' : 'var(--accent2)',
      }}>
        {isUser ? 'DU' : '◎'}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '76%' }}>
        <div style={{
          padding: '10px 14px',
          background: isUser ? 'var(--accent)' : 'var(--bg3)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          fontSize: 13.5, lineHeight: 1.65,
          color: isUser ? '#fff' : 'var(--text)',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>

        {/* Extracted entry card */}
        {msg.extracted && <ExtractedCard entry={msg.extracted} />}

        <div style={{
          fontSize: 11, color: 'var(--text3)', marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          fontFamily: 'var(--mono)',
        }}>
          {isUser ? '' : 'Claude · '}{time}
        </div>
      </div>
    </div>
  )
}

// ── Quick chips ───────────────────────────────────────────────

const CHIPS = [
  'Was steht heute an?',
  'Welche Aufgaben sind diese Woche fällig?',
  'Wie läuft mein neuestes YouTube-Video?',
  'Plane meinen heutigen Tag',
]

// ── Main component ────────────────────────────────────────────

export default function ChatClient({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const { messages, isLoading, send } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Combine server-loaded history with client-side new messages
  const allMessages: ChatMessage[] = [
    ...initialMessages,
    ...messages.filter(m => !initialMessages.find(im => im.id === m.id)),
  ]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length, isLoading])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await send(text)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)',
        }}/>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Claude</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>· persönlicher Assistent</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Welcome if no messages */}
        {allMessages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 40, animation: 'fadeIn .4s ease' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
              Wie kann ich dir helfen?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              Ich erkenne automatisch Termine, Aufgaben,<br/>Erinnerungen und Notizen.
            </p>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <MessageBubble key={msg.id ?? i} msg={msg} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg4)', border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--accent2)',
            }}>◎</div>
            <div style={{
              padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Spinner size={14} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Denke nach…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => { setInput(chip); inputRef.current?.focus() }}
              style={{
                padding: '5px 11px', borderRadius: 99,
                fontSize: 12, background: 'var(--bg3)',
                border: '1px solid var(--border)', color: 'var(--text2)',
                transition: 'all .15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text2)'  }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: 14, padding: '10px 12px',
          transition: 'border-color .2s',
        }}
        onFocus={() => {}} // handled via CSS below
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoGrow(e.target) }}
            onKeyDown={handleKey}
            placeholder="Sag mir, was du vorhast…"
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13.5, resize: 'none',
              maxHeight: 120, lineHeight: 1.5, fontFamily: 'var(--font)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg4)',
              border: 'none', color: '#fff', fontSize: 16,
              transition: 'all .15s', flexShrink: 0,
              opacity: !input.trim() || isLoading ? .4 : 1,
            }}
          >↑</button>
        </div>
      </div>
    </div>
  )
}
