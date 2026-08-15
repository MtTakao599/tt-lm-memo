import { useEffect, useState } from 'react'
import { freeMemoStorageKey, type FreeMemoRecord } from '../types/freeMemo'

const SAVE_DELAY_MS = 500

export type FreeMemoStatus = 'saving' | 'saved' | 'error'

export function useFreeMemo(userId: string) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<FreeMemoStatus>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(freeMemoStorageKey(userId))
      if (!raw) {
        setContent('')
        setSavedAt(null)
        setStatus('saved')
        setLoadedUserId(userId)
        return
      }

      const parsed = JSON.parse(raw) as FreeMemoRecord
      setContent(typeof parsed.content === 'string' ? parsed.content : '')
      setSavedAt(parsed.updatedAt ?? null)
      setStatus('saved')
      setLoadedUserId(userId)
    } catch {
      setContent('')
      setSavedAt(null)
      setStatus('error')
      setLoadedUserId(userId)
    }
  }, [userId])

  useEffect(() => {
    if (loadedUserId !== userId) {
      return
    }

    const key = freeMemoStorageKey(userId)
    let currentSaved = ''
    try {
      const raw = localStorage.getItem(key)
      currentSaved = raw ? ((JSON.parse(raw) as FreeMemoRecord).content ?? '') : ''
    } catch {
      currentSaved = ''
    }

    if (content === currentSaved) {
      return
    }

    setStatus('saving')
    const timer = window.setTimeout(() => {
      try {
        const updatedAt = new Date().toISOString()
        const record: FreeMemoRecord = {
          userId,
          content,
          updatedAt,
        }
        localStorage.setItem(key, JSON.stringify(record))
        setSavedAt(updatedAt)
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, SAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [content, loadedUserId, userId])

  return {
    content,
    setContent,
    status,
    savedAt,
  }
}
