import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchFreeMemo,
  upsertFreeMemo,
} from '../services/freeMemoService'
import { AppError, toUserMessage } from '../utils/appError'
import {
  hasMigratableLocalFreeMemo,
  readLocalFreeMemo,
  saveLocalFreeMemoBackup,
} from '../utils/freeMemoStorage'

const SAVE_DELAY_MS = 500
const FETCH_ERROR = '自由メモを取得できませんでした。更新してください。'
const MIGRATE_EMPTY_ERROR = 'この端末に移行できる自由メモがありません'

export type FreeMemoStatus = 'saving' | 'saved' | 'error'
export type FreeMemoLoadState = 'loading' | 'ready' | 'error'

export function useFreeMemo(userId: string, reloadToken = 0) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<FreeMemoStatus>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<FreeMemoLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canMigrate, setCanMigrate] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrateError, setMigrateError] = useState<string | null>(null)

  const lastSavedRef = useRef<string | null>(null)
  const flushRef = useRef({
    userId,
    content: '',
    lastSaved: null as string | null,
    canMigrate: false,
    loadState: 'loading' as FreeMemoLoadState,
  })

  useEffect(() => {
    flushRef.current = {
      userId,
      content,
      lastSaved: lastSavedRef.current,
      canMigrate,
      loadState,
    }
  })

  const applyRemote = useCallback(
    (record: { content: string; updatedAt: string; userId: string }) => {
      setContent(record.content)
      lastSavedRef.current = record.content
      setSavedAt(record.updatedAt)
      setStatus('saved')
      setCanMigrate(false)
      setMigrateError(null)
      saveLocalFreeMemoBackup(record)
    },
    [],
  )

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    setMigrateError(null)
    setCanMigrate(false)
    lastSavedRef.current = null
    try {
      const remote = await fetchFreeMemo(userId)
      if (remote) {
        applyRemote(remote)
        setLoadState('ready')
        return
      }

      if (hasMigratableLocalFreeMemo(userId)) {
        const local = readLocalFreeMemo(userId)
        setContent(local?.content ?? '')
        setSavedAt(null)
        setStatus('saved')
        setCanMigrate(true)
        lastSavedRef.current = null
        setLoadState('ready')
        return
      }

      setContent('')
      lastSavedRef.current = ''
      setSavedAt(null)
      setStatus('saved')
      setLoadState('ready')
    } catch (error) {
      setLoadError(toUserMessage(error, FETCH_ERROR))
      setLoadState('error')
      setCanMigrate(false)
      lastSavedRef.current = null
    }
  }, [applyRemote, userId])

  useEffect(() => {
    void load()
  }, [load, reloadToken])

  useEffect(() => {
    return () => {
      const snapshot = flushRef.current
      if (
        snapshot.loadState !== 'ready' ||
        snapshot.canMigrate ||
        snapshot.lastSaved === null ||
        snapshot.content === snapshot.lastSaved
      ) {
        return
      }
      void upsertFreeMemo(snapshot.userId, snapshot.content).catch(() => {
        // タブ移動時の追い出し保存。失敗は次の編集または更新で扱う
      })
    }
  }, [userId])

  useEffect(() => {
    if (loadState !== 'ready' || canMigrate || lastSavedRef.current === null) {
      return
    }
    if (content === lastSavedRef.current) {
      return
    }

    setStatus('saving')
    const contentToSave = content
    const timer = window.setTimeout(() => {
      void upsertFreeMemo(userId, contentToSave)
        .then((saved) => {
          if (flushRef.current.content !== contentToSave) {
            return
          }
          lastSavedRef.current = contentToSave
          setSavedAt(saved.updatedAt)
          setStatus('saved')
          saveLocalFreeMemoBackup(saved)
        })
        .catch(() => {
          if (flushRef.current.content !== contentToSave) {
            return
          }
          setStatus('error')
        })
    }, SAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [canMigrate, content, loadState, userId])

  const migrateFromLocal = useCallback(async () => {
    if (isMigrating) {
      return
    }
    setIsMigrating(true)
    setMigrateError(null)
    try {
      const local = readLocalFreeMemo(userId)
      if (!local || local.content.trim() === '') {
        setMigrateError(MIGRATE_EMPTY_ERROR)
        return
      }
      if (local.userId !== userId) {
        setMigrateError(MIGRATE_EMPTY_ERROR)
        return
      }
      await upsertFreeMemo(userId, local.content)
      const remote = await fetchFreeMemo(userId)
      if (!remote) {
        throw new AppError(FETCH_ERROR)
      }
      applyRemote(remote)
    } catch (error) {
      setMigrateError(toUserMessage(error, '自由メモを移行できませんでした'))
    } finally {
      setIsMigrating(false)
    }
  }, [applyRemote, isMigrating, userId])

  return {
    content,
    setContent,
    status,
    savedAt,
    loadState,
    loadError,
    canMigrate,
    isMigrating,
    migrateError,
    migrateFromLocal,
    reload: load,
  }
}
