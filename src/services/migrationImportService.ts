import { supabase } from '../lib/supabase'
import {
  ANDROID_LEGACY_SOURCE,
  type AndroidMemoJson,
  type MigrationPreview,
  type MigrationProgress,
  type MigrationResult,
  type ParsedMigrationZip,
} from '../types/migration'
import { AppError, logError } from '../utils/appError'
import { logMigration, logMigrationError } from '../utils/migrationLog'
import {
  epochMsToIso,
  extensionFromPath,
  isExistingLegacyPhotoPath,
  legacyPhotoStoragePath,
  mimeFromExtension,
  PhotoMissingError,
} from '../utils/migrationZip'
import {
  insertLegacyMemoPhotoRow,
  StorageAlreadyExistsError,
  uploadLegacyMemoPhoto,
} from './photoService'

const LEGACY_ID_CHUNK = 100
const MAX_CONSECUTIVE_FAILURES = 3

type PhotoOutcome = {
  added: number
  existing: number
  missing: number
  failed: number
}

export async function buildMigrationPreview(
  parsed: ParsedMigrationZip,
): Promise<MigrationPreview> {
  const existingByLegacyId = await fetchExistingLegacyMemos(
    parsed.memos.map((memo) => memo.androidMemoId),
  )
  const photoPaths = await fetchPhotoPaths([...existingByLegacyId.values()])

  let photoToAdd = 0
  let photoAlreadyPresent = 0
  for (const memo of parsed.memos) {
    const memoId = existingByLegacyId.get(memo.androidMemoId)
    const existingPaths = memoId ? (photoPaths.get(memoId) ?? []) : []
    for (const photo of memo.photos) {
      if (!parsed.hasPhoto(photo.file)) {
        continue
      }
      if (
        memoId &&
        isExistingLegacyPhotoPath(existingPaths, memoId, photo.androidPhotoId)
      ) {
        photoAlreadyPresent += 1
      } else {
        photoToAdd += 1
      }
    }
  }

  const zipMemoIds = [...new Set(parsed.memos.map((memo) => memo.androidMemoId))]

  return {
    mansionName: parsed.mansionName,
    memoCount: parsed.memos.length,
    alreadyImported: zipMemoIds.filter((id) => existingByLegacyId.has(id)).length,
    newCount: zipMemoIds.filter((id) => !existingByLegacyId.has(id)).length,
    photoCount: parsed.photoCount,
    photoToAdd,
    photoAlreadyPresent,
    missingPhotoCount: parsed.missingPhotoCount,
    existingByLegacyId,
  }
}

export async function importAndroidMigration(
  parsed: ParsedMigrationZip,
  userId: string,
  onProgress: (progress: MigrationProgress) => void,
): Promise<MigrationResult> {
  const existingByLegacyId = await fetchExistingLegacyMemos(
    parsed.memos.map((memo) => memo.androidMemoId),
  )
  const photoPaths = await fetchPhotoPaths([...existingByLegacyId.values()])
  const seenInZip = new Set<number>()
  const result: MigrationResult = {
    memoSuccess: 0,
    memoExisting: 0,
    memoFailed: 0,
    photoSuccess: 0,
    photoExisting: 0,
    photoMissing: parsed.manifestMissingPhotos,
    photoFailed: 0,
    allSkipped: false,
    stoppedEarly: false,
  }

  let consecutiveFailures = 0
  const total = parsed.memos.length

  for (const [index, memo] of parsed.memos.entries()) {
    onProgress({ current: index + 1, total })

    if (seenInZip.has(memo.androidMemoId)) {
      logMigration('duplicate androidMemoId in zip skipped', {
        androidMemoId: memo.androidMemoId,
      })
      continue
    }
    seenInZip.add(memo.androidMemoId)

    const existingId = existingByLegacyId.get(memo.androidMemoId)
    try {
      if (existingId) {
        result.memoExisting += 1
        const outcome = await importMemoPhotos(
          existingId,
          memo,
          parsed,
          userId,
          photoPaths.get(existingId) ?? [],
        )
        applyPhotoOutcome(result, outcome)
        consecutiveFailures = 0
        continue
      }

      const inserted = await insertLegacyMemo(memo, userId)
      if (inserted.created) {
        result.memoSuccess += 1
      } else {
        result.memoExisting += 1
      }
      existingByLegacyId.set(memo.androidMemoId, inserted.id)
      const outcome = await importMemoPhotos(
        inserted.id,
        memo,
        parsed,
        userId,
        photoPaths.get(inserted.id) ?? [],
      )
      applyPhotoOutcome(result, outcome)
      consecutiveFailures = 0
    } catch (error) {
      result.memoFailed += 1
      consecutiveFailures += 1
      logError('importAndroidMigration memo', error)
      if (error instanceof AbortMigrationError || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        result.stoppedEarly = true
        result.memoFailed += total - (index + 1)
        break
      }
    }
  }

  result.allSkipped =
    result.memoSuccess === 0 &&
    result.photoSuccess === 0 &&
    result.memoFailed === 0 &&
    result.photoFailed === 0 &&
    (result.memoExisting > 0 || result.photoExisting > 0)

  return result
}

async function insertLegacyMemo(
  memo: AndroidMemoJson,
  userId: string,
): Promise<{ id: string; created: boolean }> {
  const { data, error } = await supabase
    .from('memos')
    .insert({
      building: memo.building,
      floor: memo.floor,
      location: memo.location,
      category: memo.category,
      status: memo.status,
      content: memo.content,
      include_in_handover: memo.includeInHandover,
      created_at: epochMsToIso(memo.createdAt),
      updated_at: epochMsToIso(memo.updatedAt),
      created_by: userId,
      updated_by: userId,
      legacy_source: ANDROID_LEGACY_SOURCE,
      legacy_id: memo.androidMemoId,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    if (isUniqueViolation(error)) {
      const existingId = await fetchMemoIdByLegacyId(memo.androidMemoId)
      if (existingId) {
        return { id: existingId, created: false }
      }
    }
    logError('insertLegacyMemo', error)
    if (isAbortableFailure(error)) {
      throw new AbortMigrationError()
    }
    throw new AppError('メモを移行できませんでした')
  }

  return { id: String(data.id), created: true }
}

async function importMemoPhotos(
  memoId: string,
  memo: AndroidMemoJson,
  parsed: ParsedMigrationZip,
  userId: string,
  existingPaths: string[],
): Promise<PhotoOutcome> {
  const outcome: PhotoOutcome = {
    added: 0,
    existing: 0,
    missing: 0,
    failed: 0,
  }
  const knownPaths = [...existingPaths]

  for (const photo of memo.photos) {
    const actualZipEntry = parsed.getPhotoEntryName(photo.file)
    logMigration('photo start', {
      androidMemoId: memo.androidMemoId,
      androidPhotoId: photo.androidPhotoId,
      requestedPath: photo.file,
      normalizedPath: photo.file,
      actualZipEntry,
      supabaseMemoId: memoId,
    })

    if (isExistingLegacyPhotoPath(knownPaths, memoId, photo.androidPhotoId)) {
      outcome.existing += 1
      logMigration('existing photo skip', {
        androidMemoId: memo.androidMemoId,
        androidPhotoId: photo.androidPhotoId,
        supabaseMemoId: memoId,
      })
      continue
    }

    if (!parsed.hasPhoto(photo.file)) {
      outcome.missing += 1
      logMigrationError('photo missing', {
        androidMemoId: memo.androidMemoId,
        androidPhotoId: photo.androidPhotoId,
        requestedPath: photo.file,
      })
      continue
    }

    try {
      const blob = await parsed.readPhoto(photo.file)
      const extension = extensionFromPath(photo.file)
      const contentType = blob.type || mimeFromExtension(extension)
      const storagePath = legacyPhotoStoragePath(
        memoId,
        photo.androidPhotoId,
        extension,
      )
      logMigration('photo blob ready', {
        androidMemoId: memo.androidMemoId,
        androidPhotoId: photo.androidPhotoId,
        normalizedPath: photo.file,
        actualZipEntry,
        blobSize: blob.size,
        mime: contentType,
        storagePath,
      })

      if (knownPaths.includes(storagePath)) {
        outcome.existing += 1
        logMigration('existing photo skip', {
          androidMemoId: memo.androidMemoId,
          androidPhotoId: photo.androidPhotoId,
          storagePath,
        })
        continue
      }

      try {
        await uploadLegacyMemoPhoto({
          memoId,
          blob,
          storagePath,
          contentType,
          sortOrder: photo.sortOrder,
          userId,
        })
      } catch (uploadError) {
        if (uploadError instanceof StorageAlreadyExistsError) {
          await insertLegacyMemoPhotoRow({
            memoId,
            storagePath,
            sortOrder: photo.sortOrder,
            userId,
          })
        } else {
          throw uploadError
        }
      }

      knownPaths.push(storagePath)
      outcome.added += 1
      logMigration('photo ok', {
        androidMemoId: memo.androidMemoId,
        androidPhotoId: photo.androidPhotoId,
        storagePath,
      })
    } catch (error) {
      if (error instanceof PhotoMissingError) {
        outcome.missing += 1
        logMigrationError('photo missing', {
          androidMemoId: memo.androidMemoId,
          androidPhotoId: photo.androidPhotoId,
          requestedPath: photo.file,
        }, error)
        continue
      }
      outcome.failed += 1
      logMigrationError(
        'photo failed',
        {
          androidMemoId: memo.androidMemoId,
          androidPhotoId: photo.androidPhotoId,
          requestedPath: photo.file,
        },
        error,
      )
      logError('importMemoPhotos', error)
    }
  }

  return outcome
}

function applyPhotoOutcome(result: MigrationResult, outcome: PhotoOutcome) {
  result.photoSuccess += outcome.added
  result.photoExisting += outcome.existing
  result.photoMissing += outcome.missing
  result.photoFailed += outcome.failed
}

async function fetchExistingLegacyMemos(
  legacyIds: number[],
): Promise<Map<number, string>> {
  const existing = new Map<number, string>()
  const ids = [...new Set(legacyIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) {
    return existing
  }

  for (let offset = 0; offset < ids.length; offset += LEGACY_ID_CHUNK) {
    const chunk = ids.slice(offset, offset + LEGACY_ID_CHUNK)
    const { data, error } = await supabase
      .from('memos')
      .select('id, legacy_id')
      .eq('legacy_source', ANDROID_LEGACY_SOURCE)
      .in('legacy_id', chunk)

    if (error) {
      logError('fetchExistingLegacyMemos', error)
      throw new AppError('取り込み済みメモを確認できませんでした')
    }

    for (const row of data ?? []) {
      const id = typeof row.legacy_id === 'number' ? row.legacy_id : Number(row.legacy_id)
      if (Number.isFinite(id) && typeof row.id === 'string') {
        existing.set(id, row.id)
      }
    }
  }

  return existing
}

async function fetchMemoIdByLegacyId(legacyId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('memos')
    .select('id')
    .eq('legacy_source', ANDROID_LEGACY_SOURCE)
    .eq('legacy_id', legacyId)
    .maybeSingle()
  if (error || !data?.id) {
    return null
  }
  return String(data.id)
}

async function fetchPhotoPaths(memoIds: string[]): Promise<Map<string, string[]>> {
  const paths = new Map<string, string[]>()
  if (memoIds.length === 0) {
    return paths
  }

  const { data, error } = await supabase
    .from('memo_photos')
    .select('memo_id, storage_path')
    .in('memo_id', memoIds)

  if (error) {
    logError('fetchPhotoPaths', error)
    throw new AppError('取り込み済み写真を確認できませんでした')
  }

  for (const row of data ?? []) {
    if (typeof row.memo_id !== 'string' || typeof row.storage_path !== 'string') {
      continue
    }
    const current = paths.get(row.memo_id) ?? []
    current.push(row.storage_path)
    paths.set(row.memo_id, current)
  }
  return paths
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

function isAbortableFailure(error: { status?: number; code?: string; message?: string } | null): boolean {
  if (!error) {
    return false
  }
  if (error.status === 401 || error.status === 403) {
    return true
  }
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  return (
    message.includes('jwt') ||
    message.includes('not authenticated') ||
    message.includes('row-level security')
  )
}

class AbortMigrationError extends AppError {
  constructor() {
    super('メモを移行できませんでした')
    this.name = 'AbortMigrationError'
  }
}
