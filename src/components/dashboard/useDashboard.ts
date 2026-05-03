'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DailyOverview, Entry, UpdateEntryPayload } from '@/types'

interface UseDashboardReturn {
  overview: DailyOverview | null
  isLoading: boolean
  refresh: () => Promise<void>
  markDone: (id: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export function useDashboard(): UseDashboardReturn {
  const [overview, setOverview] = useState<DailyOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) return
      setOverview(await res.json())
    } catch (err) {
      console.error('[useDashboard]', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Optimistic mark done
  const markDone = useCallback(async (id: string) => {
    // Optimistic update
    setOverview(prev => {
      if (!prev) return prev
      const patch = (arr: Entry[]) =>
        arr.map(e => e.id === id ? { ...e, status: 'done' as const } : e)
      return { ...prev, tasks: patch(prev.tasks) }
    })

    try {
      await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' } satisfies UpdateEntryPayload),
      })
    } catch {
      refresh() // revert by re-fetching
    }
  }, [refresh])

  const deleteEntry = useCallback(async (id: string) => {
    setOverview(prev => {
      if (!prev) return prev
      const filter = (arr: Entry[]) => arr.filter(e => e.id !== id)
      return {
        ...prev,
        events: filter(prev.events),
        tasks: filter(prev.tasks),
        reminders: filter(prev.reminders),
        overdue: filter(prev.overdue),
      }
    })

    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    } catch {
      refresh()
    }
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])

  return { overview, isLoading, refresh, markDone, deleteEntry }
}
