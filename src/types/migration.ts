export const MIGRATION_FORMAT = 'KanrininMemoMigration'
export const MIGRATION_SCHEMA_VERSION = 1
export const MIGRATION_APP = 'KanrininMemo'
export const MIGRATION_SOURCE_DB_VERSION = 6
export const ANDROID_LEGACY_SOURCE = 'android-kanrininmemo'

export type MigrationManifest = {
  format: string
  schemaVersion: number
  app: string
  sourceDbVersion: number
  scope: {
    type: string
    mansionId: number
    mansionName: string
  }
  counts: {
    mansions: number
    mansionItems: number
    memos: number
    photosReferenced: number
    photosCopied: number
    photosMissing: number
  }
  missingPhotos: Array<{
    memoId: number
    photoId: number
    originalPath?: string
  }>
}

export type AndroidMansionJson = {
  androidMansionId: number
  name: string
  useBuilding: boolean
  useFloor: boolean
}

export type AndroidMansionItemJson = {
  androidItemId: number
  androidMansionId: number
  type: string
  name: string
  sortOrder: number
  enabled: boolean
  treatAsDone: boolean | null
}

export type AndroidMemoPhotoJson = {
  androidPhotoId: number
  sortOrder: number
  file: string
}

export type AndroidMemoJson = {
  androidMemoId: number
  androidMansionId: number
  mansionName: string
  building: string
  floor: string
  location: string
  category: string
  status: string
  content: string
  includeInHandover: boolean
  createdAt: number
  updatedAt: number
  photos: AndroidMemoPhotoJson[]
}

export type ParsedMigrationZip = {
  mansionName: string
  mansionItemCount: number
  memos: AndroidMemoJson[]
  photoCount: number
  missingPhotoCount: number
  manifestMissingPhotos: number
  hasPhoto: (zipPath: string) => boolean
  getPhotoEntryName: (zipPath: string) => string | null
  readPhoto: (zipPath: string) => Promise<Blob>
}

export type MigrationPreview = {
  mansionName: string
  memoCount: number
  newCount: number
  alreadyImported: number
  photoCount: number
  photoToAdd: number
  photoAlreadyPresent: number
  missingPhotoCount: number
  existingByLegacyId: Map<number, string>
}

export type MigrationProgress = {
  current: number
  total: number
}

export type MigrationResult = {
  memoSuccess: number
  memoExisting: number
  memoFailed: number
  photoSuccess: number
  photoExisting: number
  photoMissing: number
  photoFailed: number
  allSkipped: boolean
  stoppedEarly: boolean
}
