import { supabase } from '../lib/supabase'
import type { MemoPhoto } from '../types/memo'
import { AppError, logError } from '../utils/appError'
import { mapPhotoRow } from '../utils/memoMapper'
import { logMigration, logMigrationError, storageErrorInfo } from '../utils/migrationLog'
import { getPhotoObjectUrl, revokePhotoCaches } from './photoCache'

const BUCKET = 'memo-photos'

export async function loadPhotoUrl(photo: MemoPhoto): Promise<MemoPhoto> {
  if (photo.url || !photo.storagePath) {
    return photo
  }
  try {
    const url = await getPhotoObjectUrl(photo.storagePath)
    return { ...photo, url }
  } catch (error) {
    logError('loadPhotoUrl', error)
    return photo
  }
}

export async function loadMemoPhotos(
  photos: MemoPhoto[],
  mode: 'first' | 'all',
): Promise<MemoPhoto[]> {
  return Promise.all(
    photos.map((photo, index) => {
      if (mode === 'first' && index > 0) {
        return photo
      }
      return loadPhotoUrl(photo)
    }),
  )
}

export async function uploadMemoPhoto(input: {
  memoId: string
  blob: Blob
  sortOrder: number
  userId: string
}): Promise<MemoPhoto> {
  const fileId = crypto.randomUUID()
  const storagePath = `${input.memoId}/${fileId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    logError('photo upload', uploadError)
    throw new AppError('写真を保存できませんでした')
  }

  const { data, error } = await supabase
    .from('memo_photos')
    .insert({
      memo_id: input.memoId,
      storage_path: storagePath,
      sort_order: input.sortOrder,
      created_by: input.userId,
    })
    .select('id, memo_id, storage_path, sort_order, created_by, created_at')
    .single()

  if (error || !data) {
    logError('memo_photos insert', error)
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new AppError('写真を保存できませんでした')
  }

  const mapped = mapPhotoRow(data)
  try {
    mapped.url = await getPhotoObjectUrl(storagePath)
  } catch {
    mapped.url = URL.createObjectURL(input.blob)
  }
  return mapped
}

export async function uploadLegacyMemoPhoto(input: {
  memoId: string
  blob: Blob
  storagePath: string
  contentType: string
  sortOrder: number
  userId: string
}): Promise<void> {
  logMigration('storage upload start', {
    bucket: BUCKET,
    storagePath: input.storagePath,
    blobSize: input.blob.size,
    blobType: input.blob.type || '(empty)',
    contentType: input.contentType,
    sortOrder: input.sortOrder,
    upsert: false,
  })

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(input.storagePath, input.blob, {
      contentType: input.contentType,
      upsert: false,
    })

  if (uploadError) {
    logMigrationError(
      'storage upload failed',
      {
        storagePath: input.storagePath,
        blobSize: input.blob.size,
        contentType: input.contentType,
        ...storageErrorInfo(uploadError),
      },
      uploadError,
    )
    logError('legacy photo upload', uploadError)
    if (isStorageAlreadyExists(uploadError)) {
      throw new StorageAlreadyExistsError()
    }
    throw new AppError('写真を保存できませんでした')
  }

  logMigration('storage upload ok', {
    storagePath: input.storagePath,
    uploadedPath: uploadData?.path ?? null,
    fullPath: uploadData?.fullPath ?? null,
  })

  const { error } = await supabase.from('memo_photos').insert({
    memo_id: input.memoId,
    storage_path: input.storagePath,
    sort_order: input.sortOrder,
    created_by: input.userId,
  })

  if (error) {
    if (error.code === '23505') {
      logMigration('memo_photos already exists', {
        memoId: input.memoId,
        storagePath: input.storagePath,
      })
      return
    }
    logMigrationError(
      'memo_photos insert failed',
      {
        memoId: input.memoId,
        storagePath: input.storagePath,
        sortOrder: input.sortOrder,
        ...storageErrorInfo(error),
      },
      error,
    )
    logError('legacy memo_photos insert', error)
    await supabase.storage.from(BUCKET).remove([input.storagePath])
    throw new AppError('写真を保存できませんでした')
  }

  logMigration('memo_photos insert ok', {
    memoId: input.memoId,
    storagePath: input.storagePath,
    sortOrder: input.sortOrder,
  })
}

export async function insertLegacyMemoPhotoRow(input: {
  memoId: string
  storagePath: string
  sortOrder: number
  userId: string
}): Promise<void> {
  const { error } = await supabase.from('memo_photos').insert({
    memo_id: input.memoId,
    storage_path: input.storagePath,
    sort_order: input.sortOrder,
    created_by: input.userId,
  })
  if (error) {
    if (error.code === '23505') {
      logMigration('memo_photos already exists', {
        memoId: input.memoId,
        storagePath: input.storagePath,
      })
      return
    }
    logMigrationError(
      'memo_photos insert failed',
      {
        memoId: input.memoId,
        storagePath: input.storagePath,
        sortOrder: input.sortOrder,
        ...storageErrorInfo(error),
      },
      error,
    )
    throw new AppError('写真を保存できませんでした')
  }
  logMigration('memo_photos insert ok', {
    memoId: input.memoId,
    storagePath: input.storagePath,
    sortOrder: input.sortOrder,
  })
}

export async function blobFromPhoto(photo: MemoPhoto): Promise<Blob> {
  if (photo.blob) {
    return photo.blob
  }
  const response = await fetch(photo.url)
  if (!response.ok) {
    throw new AppError('写真を保存できませんでした')
  }
  return response.blob()
}

export async function removeStoredPhotos(photos: MemoPhoto[]) {
  const paths = photos
    .map((photo) => photo.storagePath)
    .filter((path): path is string => Boolean(path))
  if (paths.length === 0) {
    return
  }

  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) {
    logError('storage remove', error)
    throw new AppError('写真を削除できませんでした')
  }

  const { error: dbError } = await supabase
    .from('memo_photos')
    .delete()
    .in(
      'id',
      photos.map((photo) => photo.id),
    )
  if (dbError) {
    logError('memo_photos delete', dbError)
    throw new AppError('写真を削除できませんでした')
  }

  revokePhotoCaches(paths)
}

export async function removeStorageFiles(storagePaths: string[]) {
  if (storagePaths.length === 0) {
    return
  }
  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths)
  if (error) {
    logError('storage remove files', error)
    throw new AppError('写真を削除できませんでした')
  }
  revokePhotoCaches(storagePaths)
}

export class StorageAlreadyExistsError extends AppError {
  constructor() {
    super('写真はすでに保存されています')
    this.name = 'StorageAlreadyExistsError'
  }
}

function isStorageAlreadyExists(error: {
  statusCode?: string | number
  status?: number
  message?: string
  error?: string
}): boolean {
  const status = String(error.statusCode ?? error.status ?? '')
  const text = `${error.message ?? ''} ${error.error ?? ''}`.toLowerCase()
  return (
    status === '409' ||
    text.includes('already exists') ||
    text.includes('duplicate') ||
    text.includes('resource already exists')
  )
}
