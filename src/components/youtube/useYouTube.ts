'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardYouTubeData } from '@/lib/youtube/types'

type Period = '7d' | '28d' | '90d'

interface UseYouTubeReturn {
  data: DashboardYouTubeData | null
  isLoading: boolean
  isConnected: boolean
  error: string | null
  period: Period
  setPeriod: (p: Period) => void
  refresh: () => Promise<void>
  connectUrl: string
}

export function useYouTube(): UseYouTubeReturn {
  const [data, setData] = useState<DashboardYouTubeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('28d')

  const fetch_ = useCallback(async (p: Period) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube/data?period=${p}&insights=true`)
      const json = await res.json()

      if (res.status === 403 && json.error === 'youtube_not_connected') {
        setIsConnected(false)
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Unknown error')

      setData(json as DashboardYouTubeData)
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(() => fetch_(period), [fetch_, period])

  useEffect(() => { fetch_(period) }, [fetch_, period])

  return {
    data,
    isLoading,
    isConnected,
    error,
    period,
    setPeriod,
    refresh,
    connectUrl: '/api/youtube/auth',
  }
}
