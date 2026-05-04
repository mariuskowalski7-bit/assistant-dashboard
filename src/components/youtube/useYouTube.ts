'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardYouTubeData } from '@/lib/youtube/types'

type Period = '7d' | '28d' | '90d'

interface UseYouTubeReturn {
  data: DashboardYouTubeData | null
  isLoading: boolean
  error: string | null
  notConfigured: boolean   // true when NEXT_PUBLIC_YOUTUBE_CHANNEL_ID is missing
  period: Period
  setPeriod: (p: Period) => void
  refresh: () => Promise<void>
}

export function useYouTube(): UseYouTubeReturn {
  const [data, setData]               = useState<DashboardYouTubeData | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [period, setPeriod]           = useState<Period>('28d')

  const load = useCallback(async (p: Period) => {
    setIsLoading(true)
    setError(null)
    setNotConfigured(false)
    try {
      const res  = await fetch(`/api/youtube/data?period=${p}&insights=true`)
      const json = await res.json()

      if (res.status === 422 && json.error === 'youtube_not_configured') {
        setNotConfigured(true)
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Unknown error')
      setData(json as DashboardYouTubeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(() => load(period), [load, period])
  useEffect(() => { load(period) }, [load, period])

  return { data, isLoading, error, notConfigured, period, setPeriod, refresh }
}
