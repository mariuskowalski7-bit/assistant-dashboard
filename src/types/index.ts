// ============================================================
// Types – mirror the Supabase schema 1:1
// ============================================================

export type EntryType = 'event' | 'task' | 'reminder' | 'note'
export type EntryStatus = 'pending' | 'done' | 'cancelled'
export type EntryPriority = 'low' | 'medium' | 'high'
export type MessageRole = 'user' | 'assistant'

export interface Entry {
  id: string
  user_id: string
  type: EntryType
  title: string
  body?: string | null
  date?: string | null       // ISO date: '2026-04-30'
  time?: string | null       // '14:00:00'
  due_date?: string | null
  status: EntryStatus
  priority: EntryPriority
  context?: string | null
  apple_id?: string | null
  synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface Preference {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: MessageRole
  content: string
  extracted?: ExtractedEntry | null  // what Claude parsed from the message
  created_at: string
}

// What Claude returns when it classifies a user message
export interface ExtractedEntry {
  type: EntryType
  title: string
  date?: string
  time?: string
  due_date?: string
  priority?: EntryPriority
  context?: string
}

// Payload shapes for API routes
export interface CreateEntryPayload {
  type: EntryType
  title: string
  body?: string
  date?: string
  time?: string
  due_date?: string
  priority?: EntryPriority
  context?: string
}

export interface UpdateEntryPayload {
  title?: string
  body?: string
  date?: string
  time?: string
  due_date?: string
  status?: EntryStatus
  priority?: EntryPriority
  context?: string
}

export interface ChatPayload {
  message: string
  // Last N messages for context (client sends them, server appends)
  history?: Array<{ role: MessageRole; content: string }>
}

// What the /api/dashboard endpoint returns
export interface DailyOverview {
  date: string
  events: Entry[]
  tasks: Entry[]
  reminders: Entry[]
  overdue: Entry[]
}
