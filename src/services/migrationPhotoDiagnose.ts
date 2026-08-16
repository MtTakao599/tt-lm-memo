import { supabase } from '../lib/supabase'
import { ANDROID_LEGACY_SOURCE } from '../types/migration'
import { logMigration, logMigrationError, storageErrorInfo } from '../utils/migrationLog'

export type MigratedPhotoPattern = 'A' | 'B' | 'C' | 'mixed' | 'none'

export type MigratedPhotoDiagnosis = {
  memoCount: number
  photoRowCount: number
  storageFileCount: number
  storageListFailed: number
  pattern: MigratedPhotoPattern
  summary: string
}

type MigratedMemoRow = {
  id: string
  legacy_id: number | string | null
}

export async function diagnoseMigratedPhotos(): Promise<MigratedPhotoDiagnosis> {
  const { data: memos, error: memoError } = await supabase
    .from('memos')
    .select('id, legacy_id')
    .eq('legacy_source', ANDROID_LEGACY_SOURCE)

  if (memoError || !memos) {
    logMigrationError('diagnose memos', {}, memoError)
    throw new Error('移行メモの確認に失敗しました')
  }

  const memoIds = memos.map((row) => row.id)
  let photoRows: Array<{ memo_id: string; storage_path: string; sort_order: number }> =
    []

  if (memoIds.length > 0) {
    const { data, error } = await supabase
      .from('memo_photos')
      .select('memo_id, storage_path, sort_order')
      .in('memo_id', memoIds)
    if (error) {
      logMigrationError('diagnose memo_photos', {}, error)
      throw new Error('memo_photos の確認に失敗しました')
    }
    photoRows = data ?? []
  }

  const photosByMemo = new Map<string, typeof photoRows>()
  for (const row of photoRows) {
    const current = photosByMemo.get(row.memo_id) ?? []
    current.push(row)
    photosByMemo.set(row.memo_id, current)
  }

  let storageFileCount = 0
  let storageListFailed = 0
  const memoPatterns: MigratedPhotoPattern[] = []

  for (const memo of memos as MigratedMemoRow[]) {
    const dbPhotos = photosByMemo.get(memo.id) ?? []
    const listed = await listStorageFiles(memo.id)
    if (listed.error) {
      storageListFailed += 1
    }
    storageFileCount += listed.names.length

    const hasDb = dbPhotos.length > 0
    const hasStorage = listed.names.length > 0
    const pattern: MigratedPhotoPattern = !hasDb && !hasStorage ? 'A' : hasStorage && !hasDb ? 'B' : 'C'
    memoPatterns.push(pattern)

    logMigration('diagnose memo', {
      memoId: memo.id,
      legacyId: memo.legacy_id,
      memoPhotosRows: dbPhotos.length,
      dbPaths: dbPhotos.map((row) => row.storage_path),
      storageFiles: listed.names,
      storageListError: listed.error,
      pattern,
    })
  }

  const pattern = summarizePattern(memoPatterns, memos.length)
  const result: MigratedPhotoDiagnosis = {
    memoCount: memos.length,
    photoRowCount: photoRows.length,
    storageFileCount,
    storageListFailed,
    pattern,
    summary: patternLabel(pattern, memos.length, photoRows.length, storageFileCount),
  }
  logMigration('diagnose summary', result)
  return result
}

async function listStorageFiles(memoId: string): Promise<{
  names: string[]
  error: Record<string, unknown> | null
}> {
  const { data, error } = await supabase.storage.from('memo-photos').list(memoId, {
    limit: 100,
  })
  if (error) {
    return { names: [], error: storageErrorInfo(error) }
  }
  return {
    names: (data ?? [])
      .map((item) => item.name)
      .filter((name) => name && name !== '.emptyFolderPlaceholder'),
    error: null,
  }
}

function summarizePattern(
  patterns: MigratedPhotoPattern[],
  memoCount: number,
): MigratedPhotoPattern {
  if (memoCount === 0) {
    return 'none'
  }
  const unique = new Set(patterns)
  if (unique.size === 1) {
    return patterns[0] ?? 'none'
  }
  return 'mixed'
}

function patternLabel(
  pattern: MigratedPhotoPattern,
  memoCount: number,
  photoRowCount: number,
  storageFileCount: number,
): string {
  if (pattern === 'none') {
    return '移行メモが見つかりません'
  }
  if (pattern === 'A') {
    return `A: Storageにも memo_photos にもありません（移行メモ${memoCount}件）`
  }
  if (pattern === 'B') {
    return `B: Storageにはありますが memo_photos がありません（Storage ${storageFileCount}件）`
  }
  if (pattern === 'C') {
    return `C: Storageと memo_photos はあります（行${photoRowCount}件 / Storage ${storageFileCount}件）。表示側の可能性`
  }
  return `mixed: メモごとに状態が違います（memo_photos ${photoRowCount}件 / Storage ${storageFileCount}件）`
}
