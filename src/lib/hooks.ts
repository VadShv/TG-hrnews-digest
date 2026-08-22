'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setData: (d: T | null) => void
}

/// Lightweight fetch hook (GET only) with manual refresh and re-fetch on dependency change.
export function useFetch<T = unknown>(
  url: string | null,
  opts?: { deps?: unknown[]; initial?: T | null },
): FetchState<T> {
  const [data, setData] = useState<T | null>(opts?.initial ?? null)
  const [loading, setLoading] = useState<boolean>(!!url)
  const [error, setError] = useState<string | null>(null)
  const reqIdRef = useRef(0)

  const deps = opts?.deps ?? []

  const run = useCallback(async () => {
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }
    const id = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as T
      if (id === reqIdRef.current) {
        setData(json)
      }
    } catch (e) {
      if (id === reqIdRef.current) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    void run()
  }, [url, ...deps])

  return { data, loading, error, refresh: run, setData }
}

/// GET/POST/PATCH/DELETE helper returning parsed JSON or throwing.
export async function apiCall<T = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return json as T
}
