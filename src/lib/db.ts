import { createClient } from './supabase/server'
import type { Entry, CreateEntryPayload, UpdateEntryPayload, DailyOverview } from '@/types'

// ── Create ───────────────────────────────────────────────────
export async function createEntry(
  userId: string,
  payload: CreateEntryPayload
): Promise<Entry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Entry
}

// ── Read: today's overview ───────────────────────────────────
export async function getDailyOverview(userId: string): Promise<DailyOverview> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .or(`date.eq.${today},and(type.eq.task,status.eq.pending)`)
    .order('time', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  const entries = (data ?? []) as Entry[]

  return {
    date: today,
    events:    entries.filter(e => e.type === 'event' && e.date === today),
    tasks:     entries.filter(e => e.type === 'task' && e.status === 'pending'),
    reminders: entries.filter(e => e.type === 'reminder' && e.date === today),
    overdue:   entries.filter(e =>
      e.type === 'task' &&
      e.status === 'pending' &&
      e.due_date != null &&
      e.due_date < today
    ),
  }
}

// ── Read: paginated list ─────────────────────────────────────
export async function getEntries(
  userId: string,
  filters: { type?: string; status?: string } = {}
): Promise<Entry[]> {
  const supabase = await createClient()
  let query = supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.type)   query = query.eq('type', filters.type)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Entry[]
}

// ── Update ───────────────────────────────────────────────────
export async function updateEntry(
  userId: string,
  entryId: string,
  payload: UpdateEntryPayload
): Promise<Entry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entries')
    .update(payload)
    .eq('id', entryId)
    .eq('user_id', userId)   // RLS double-check
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Entry
}

// ── Delete (soft: set cancelled) ─────────────────────────────
export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('entries')
    .update({ status: 'cancelled' })
    .eq('id', entryId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

// ── Preferences ──────────────────────────────────────────────
export async function getPreferences(
  userId: string
): Promise<Array<{ key: string; value: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('preferences')
    .select('key, value')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return (data ?? []) as Array<{ key: string; value: string }>
}

export async function upsertPreference(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('preferences')
    .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })

  if (error) throw new Error(error.message)
}
