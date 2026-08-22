import { supabase } from '../lib/supabase'
import type { MemoRowWithRelations } from '../types/database'
import type { Memo, MemoDraft, MemoPhoto } from '../types/memo'
import { AppError, logError } from '../utils/appError'
import {
  draftToMemoInsert,
  draftToMemoUpdate,
  mapMemoRow,
} from '../utils/memoMapper'
import {
  blobFromPhoto,
  loadMemoPhotos,
  removeStorageFiles,
  removeStoredPhotos,
  uploadMemoPhoto,
} from './photoService'

const MEMO_SELECT = `
  id,
  building,
  floor,
  location,
  category,
  status,
  content,
  include_in_handover,
  created_by,
  updated_by,
  created_at,
  updated_at,
  created_profile:profiles!created_by(display_name),
  updated_profile:profiles!updated_by(display_name),
  memo_photos(id, memo_id, storage_path, sort_order, created_by, created_at)
`

const MEMO_SELECT_BASIC = `
  id,
  building,
  floor,
  location,
  category,
  status,
  content,
  include_in_handover,
  created_by,
  updated_by,
  created_at,
  updated_at,
  memo_photos(id, memo_id, storage_path, sort_order, created_by, created_at)
`

export type SaveMemoResult = {
  memo: Memo
  photoWarning: string | null
}

export async function fetchMemos(): Promise<Memo[]> {
  const { data, error } = await supabase
    .from('memos')
    .select(MEMO_SELECT)
    .order('created_at', { ascending: false })

  if (!error && data) {
    return (data as MemoRowWithRelations[]).map((row) => mapMemoRow(row))
  }

  logError('fetchMemos nested profiles', error)

  const fallback = await supabase
    .from('memos')
    .select(MEMO_SELECT_BASIC)
    .order('created_at', { ascending: false })

  if (fallback.error || !fallback.data) {
    logError('fetchMemos', fallback.error)
    throw new AppError('メモを読み込めませんでした')
  }

  const rows = fallback.data as MemoRowWithRelations[]
  const names = await fetchProfileNames(
    rows.flatMap((row) => [row.created_by, row.updated_by]),
  )
  return rows.map((row) => mapMemoRow(row, names))
}

export async function fetchProfileDisplayName(userId: string): Promise<string> {
  const names = await fetchProfileNames([userId])
  return names.get(userId) || '不明'
}

async function fetchProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  const names = new Map<string, string>()
  if (ids.length === 0) {
    return names
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', ids)
    if (error || !data) {
      logError('fetch profiles', error)
      return names
    }
    for (const row of data) {
      if (typeof row.id === 'string' && typeof row.display_name === 'string') {
        names.set(row.id, row.display_name.trim() || '不明')
      }
    }
  } catch (error) {
    logError('fetch profiles', error)
  }
  return names
}

export async function createMemo(
  draft: MemoDraft,
  userId: string,
): Promise<SaveMemoResult> {
  const { data, error } = await supabase
    .from('memos')
    .insert(draftToMemoInsert(draft, userId))
    .select(MEMO_SELECT_BASIC)
    .single()

  if (error || !data) {
    logError('createMemo', error)
    throw new AppError('メモを保存できませんでした')
  }

  const names = await fetchProfileNames([userId])
  let memo = mapMemoRow(data as MemoRowWithRelations, names)
  const { photos, warning } = await uploadNewPhotos(memo.id, draft.photos, userId)
  revokeLocalPhotoUrls(draft.photos)
  memo = { ...memo, photos }
  return { memo, photoWarning: warning }
}

export async function updateMemo(
  memoId: string,
  draft: MemoDraft,
  currentPhotos: MemoPhoto[],
  userId: string,
): Promise<SaveMemoResult> {
  const { data, error } = await supabase
    .from('memos')
    .update(draftToMemoUpdate(draft))
    .eq('id', memoId)
    .select(MEMO_SELECT_BASIC)
    .single()

  if (error || !data) {
    logError('updateMemo', error)
    throw new AppError('メモを保存できませんでした')
  }

  const removed = currentPhotos.filter(
    (photo) =>
      photo.storagePath &&
      !draft.photos.some((item) => item.id === photo.id),
  )
  if (removed.length > 0) {
    try {
      await removeStoredPhotos(removed)
    } catch (removeError) {
      logError('updateMemo remove photos', removeError)
      throw new AppError('写真を削除できませんでした')
    }
  }

  const nextPhotos: MemoPhoto[] = []
  let failed = 0
  for (const [index, photo] of draft.photos.entries()) {
    if (photo.storagePath) {
      const { error: sortError } = await supabase
        .from('memo_photos')
        .update({ sort_order: index })
        .eq('id', photo.id)
      if (sortError) {
        logError('updateMemo sort photos', sortError)
      }
      nextPhotos.push(photo)
      continue
    }
    try {
      const blob = await blobFromPhoto(photo)
      nextPhotos.push(
        await uploadMemoPhoto({
          memoId,
          blob,
          sortOrder: index,
          userId,
        }),
      )
    } catch (uploadError) {
      failed += 1
      logError('updateMemo upload photos', uploadError)
    }
  }

  revokeLocalPhotoUrls(draft.photos)

  const names = await fetchProfileNames([
    (data as MemoRowWithRelations).created_by,
    (data as MemoRowWithRelations).updated_by,
    userId,
  ])
  const memo = {
    ...mapMemoRow(data as MemoRowWithRelations, names),
    photos: nextPhotos,
  }
  return {
    memo,
    photoWarning:
      failed > 0
        ? 'メモは保存しましたが、一部の写真を保存できませんでした'
        : null,
  }
}

export async function updateMemoStatus(id: string, status: string): Promise<Memo> {
  return patchMemo(id, { status })
}

export async function deleteMemo(memo: Memo): Promise<void> {
  const { data: photoRows, error: photoError } = await supabase
    .from('memo_photos')
    .select('storage_path')
    .eq('memo_id', memo.id)

  if (photoError) {
    logError('deleteMemo list photos', photoError)
    throw new AppError('メモを削除できませんでした')
  }

  const storagePaths = (photoRows ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path))

  if (storagePaths.length > 0) {
    try {
      await removeStorageFiles(storagePaths)
    } catch (error) {
      logError('deleteMemo storage', error)
      throw new AppError('メモを削除できませんでした')
    }
  }

  const { error } = await supabase.from('memos').delete().eq('id', memo.id)
  if (error) {
    logError('deleteMemo row', error)
    if (storagePaths.length > 0) {
      throw new AppError(
        '写真は削除しましたが、メモを削除できませんでした',
      )
    }
    throw new AppError('メモを削除できませんでした')
  }
}

export async function hydrateMemoPhotos(
  memos: Memo[],
  mode: 'first' | 'all',
): Promise<Memo[]> {
  return Promise.all(
    memos.map(async (memo) => ({
      ...memo,
      photos: await loadMemoPhotos(memo.photos, mode),
    })),
  )
}

function revokeLocalPhotoUrls(photos: MemoPhoto[]) {
  for (const photo of photos) {
    if (!photo.storagePath && photo.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url)
    }
  }
}

async function patchMemo(
  id: string,
  patch: { status: string },
): Promise<Memo> {
  const { data, error } = await supabase
    .from('memos')
    .update(patch)
    .eq('id', id)
    .select(MEMO_SELECT_BASIC)
    .single()

  if (error || !data) {
    logError('patchMemo', error)
    throw new AppError('状態を更新できませんでした')
  }

  const row = data as MemoRowWithRelations
  const names = await fetchProfileNames([row.created_by, row.updated_by])
  return mapMemoRow(row, names)
}

async function uploadNewPhotos(
  memoId: string,
  photos: MemoPhoto[],
  userId: string,
  startIndex = 0,
): Promise<{ photos: MemoPhoto[]; warning: string | null }> {
  const saved: MemoPhoto[] = []
  let failed = 0

  for (const [index, photo] of photos.entries()) {
    try {
      const blob = await blobFromPhoto(photo)
      saved.push(
        await uploadMemoPhoto({
          memoId,
          blob,
          sortOrder: startIndex + index,
          userId,
        }),
      )
    } catch (error) {
      failed += 1
      logError('uploadNewPhotos', error)
    }
  }

  return {
    photos: saved,
    warning:
      failed > 0
        ? 'メモは保存しましたが、一部の写真を保存できませんでした'
        : null,
  }
}
