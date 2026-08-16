import type JSZip from 'jszip'
import { PROPERTY_NAME } from '../constants'
import {
  MIGRATION_APP,
  MIGRATION_FORMAT,
  MIGRATION_SCHEMA_VERSION,
  MIGRATION_SOURCE_DB_VERSION,
  type AndroidMansionItemJson,
  type AndroidMansionJson,
  type AndroidMemoJson,
  type AndroidMemoPhotoJson,
  type MigrationManifest,
  type ParsedMigrationZip,
} from '../types/migration'
import { AppError } from './appError'
import { logMigration } from './migrationLog'

const MAX_ZIP_BYTES = 80 * 1024 * 1024
const MAX_ENTRIES = 500
const MAX_PHOTO_BYTES = 15 * 1024 * 1024

type ZipPhotoEntry = {
  name: string
  async: (type: 'uint8array') => Promise<Uint8Array>
}

export class MigrationZipError extends AppError {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationZipError'
  }
}

export class PhotoMissingError extends MigrationZipError {
  constructor() {
    super('写真ファイルが見つかりません')
    this.name = 'PhotoMissingError'
  }
}

export class PhotoEmptyError extends MigrationZipError {
  constructor() {
    super('写真ファイルが空です')
    this.name = 'PhotoEmptyError'
  }
}

export async function parseMigrationZip(file: File): Promise<ParsedMigrationZip> {
  if (file.size > MAX_ZIP_BYTES) {
    throw new MigrationZipError('移行ZIPが大きすぎます')
  }

  const { default: JSZip } = await import('jszip')
  let zip: InstanceType<typeof JSZip>
  try {
    zip = await JSZip.loadAsync(file)
  } catch (error) {
    console.error('migration zip load', error)
    throw new MigrationZipError('移行ZIPを読み込めませんでした')
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir)
  if (entries.length > MAX_ENTRIES) {
    throw new MigrationZipError('移行ZIPのファイル数が多すぎます')
  }

  const json = {
    manifest: parseJsonFile<unknown>(
      await readRequiredText(zip, 'manifest.json'),
      'manifest.json',
    ),
    mansions: parseJsonFile<unknown>(
      await readRequiredText(zip, 'mansions.json'),
      'mansions.json',
    ),
    mansionItems: parseJsonFile<unknown>(
      await readRequiredText(zip, 'mansion_items.json'),
      'mansion_items.json',
    ),
    memos: parseJsonFile<unknown>(
      await readRequiredText(zip, 'memos.json'),
      'memos.json',
    ),
  }

  const manifest = validateManifest(json.manifest)
  const mansions = validateMansions(json.mansions)
  const mansionItems = validateMansionItems(json.mansionItems)
  const memos = validateMemos(json.memos)
  const mansionName = resolveMansionName(manifest, mansions)
  const mansionNames = [manifest.scope.mansionName.trim(), mansions[0]?.name.trim()]
    .filter((name): name is string => Boolean(name))

  if (mansionNames.some((name) => name !== PROPERTY_NAME)) {
    throw new MigrationZipError(
      'この移行データは東京テラスのものではありません',
    )
  }

  const photoEntries = new Map<string, ZipPhotoEntry>()
  for (const entry of entries) {
    const normalized = normalizeZipPath(entry.name)
    if (isSafePhotoPath(normalized)) {
      photoEntries.set(normalized, entry)
    }
  }

  logMigration('zip entries', {
    entryCount: entries.length,
    entryNames: entries.map((entry) => entry.name),
    normalizedPhotoNames: [...photoEntries.keys()],
  })

  let photoCount = 0
  let missingFromZip = 0
  for (const memo of memos) {
    for (const photo of memo.photos) {
      const entry = photoEntries.get(photo.file)
      logMigration('zip photo lookup', {
        androidMemoId: memo.androidMemoId,
        androidPhotoId: photo.androidPhotoId,
        normalizedPath: photo.file,
        actualZipEntry: entry?.name ?? null,
        found: Boolean(entry),
      })
      if (entry) {
        photoCount += 1
      } else {
        missingFromZip += 1
      }
    }
  }

  return {
    mansionName,
    mansionItemCount: mansionItems.length,
    memos,
    photoCount,
    missingPhotoCount: manifest.counts.photosMissing + missingFromZip,
    manifestMissingPhotos: manifest.counts.photosMissing,
    hasPhoto: (zipPath: string) => photoEntries.has(normalizeZipPath(zipPath)),
    getPhotoEntryName: (zipPath: string) =>
      photoEntries.get(normalizeZipPath(zipPath))?.name ?? null,
    readPhoto: async (zipPath: string) => {
      const normalizedPath = normalizeZipPath(zipPath)
      const entry = photoEntries.get(normalizedPath)
      if (!entry) {
        logMigration('readPhoto missing', {
          requestedPath: zipPath,
          normalizedPath,
        })
        throw new PhotoMissingError()
      }

      const bytes = await entry.async('uint8array')
      const extension = extensionFromPath(normalizedPath)
      const mime = mimeFromExtension(extension)
      logMigration('readPhoto bytes', {
        normalizedPath,
        actualZipEntry: entry.name,
        byteLength: bytes.byteLength,
        mime,
      })
      if (bytes.byteLength === 0) {
        throw new PhotoEmptyError()
      }
      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        throw new MigrationZipError('写真ファイルが大きすぎます')
      }
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return new Blob([copy], { type: mime })
    },
  }
}

export function normalizeZipPath(name: string): string {
  return name.replace(/^\.\//, '').replace(/\\/g, '/')
}

export function extensionFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? 'jpg'
  return /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
}

export function mimeFromExtension(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'heic':
      return 'image/heic'
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg'
  }
}

export function legacyPhotoStoragePath(
  memoId: string,
  androidPhotoId: number,
  extension: string,
): string {
  return `${memoId}/legacy-${androidPhotoId}.${extension}`
}

export function isExistingLegacyPhotoPath(
  storagePaths: string[],
  memoId: string,
  androidPhotoId: number,
): boolean {
  const prefix = `${memoId}/legacy-${androidPhotoId}`
  return storagePaths.some(
    (path) => path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}-`),
  )
}

export function epochMsToIso(epochMs: number): string {
  const date = new Date(epochMs)
  if (Number.isNaN(date.getTime())) {
    throw new MigrationZipError('移行データの日時が正しくありません')
  }
  return date.toISOString()
}

async function readRequiredText(zip: JSZip, name: string): Promise<string> {
  const entry = zip.file(name)
  if (!entry) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return entry.async('string')
}

function parseJsonFile<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.error(`migration json ${label}`, error)
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
}

function validateManifest(value: unknown): MigrationManifest {
  if (!isRecord(value)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  if (
    value.format !== MIGRATION_FORMAT ||
    value.schemaVersion !== MIGRATION_SCHEMA_VERSION ||
    value.app !== MIGRATION_APP ||
    value.sourceDbVersion !== MIGRATION_SOURCE_DB_VERSION
  ) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }

  const scope = value.scope
  const counts = value.counts
  if (!isRecord(scope) || !isRecord(counts)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }

  return {
    format: MIGRATION_FORMAT,
    schemaVersion: MIGRATION_SCHEMA_VERSION,
    app: MIGRATION_APP,
    sourceDbVersion: MIGRATION_SOURCE_DB_VERSION,
    scope: {
      type: asString(scope.type),
      mansionId: asFiniteNumber(scope.mansionId),
      mansionName: asString(scope.mansionName),
    },
    counts: {
      mansions: asFiniteNumber(counts.mansions),
      mansionItems: asFiniteNumber(counts.mansionItems),
      memos: asFiniteNumber(counts.memos),
      photosReferenced: asFiniteNumber(counts.photosReferenced),
      photosCopied: asFiniteNumber(counts.photosCopied),
      photosMissing: asFiniteNumber(counts.photosMissing),
    },
    missingPhotos: Array.isArray(value.missingPhotos) ? value.missingPhotos : [],
  }
}

function validateMansions(value: unknown): AndroidMansionJson[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new MigrationZipError('移行データの形式が正しくありません')
    }
    return {
      androidMansionId: asFiniteNumber(item.androidMansionId),
      name: asString(item.name),
      useBuilding: Boolean(item.useBuilding),
      useFloor: Boolean(item.useFloor),
    }
  })
}

function validateMansionItems(value: unknown): AndroidMansionItemJson[] {
  if (!Array.isArray(value)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new MigrationZipError('移行データの形式が正しくありません')
    }
    return {
      androidItemId: asFiniteNumber(item.androidItemId),
      androidMansionId: asFiniteNumber(item.androidMansionId),
      type: asString(item.type),
      name: asString(item.name),
      sortOrder: asFiniteNumber(item.sortOrder),
      enabled: Boolean(item.enabled),
      treatAsDone:
        item.treatAsDone === null || item.treatAsDone === undefined
          ? null
          : Boolean(item.treatAsDone),
    }
  })
}

function validateMemos(value: unknown): AndroidMemoJson[] {
  if (!Array.isArray(value)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new MigrationZipError('移行データの形式が正しくありません')
    }
    return {
      androidMemoId: asFiniteNumber(item.androidMemoId),
      androidMansionId: asFiniteNumber(item.androidMansionId),
      mansionName: asString(item.mansionName),
      building: asString(item.building),
      floor: asString(item.floor),
      location: asString(item.location),
      category: asString(item.category),
      status: asString(item.status),
      content: asString(item.content),
      includeInHandover: Boolean(item.includeInHandover),
      createdAt: asFiniteNumber(item.createdAt),
      updatedAt: asFiniteNumber(item.updatedAt),
      photos: validatePhotos(item.photos),
    }
  })
}

function validatePhotos(value: unknown): AndroidMemoPhotoJson[] {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new MigrationZipError('移行データの形式が正しくありません')
    }
    const file = normalizeZipPath(asString(item.file))
    if (!isSafePhotoPath(file)) {
      throw new MigrationZipError('移行データの形式が正しくありません')
    }
    return {
      androidPhotoId: asFiniteNumber(item.androidPhotoId),
      sortOrder: asFiniteNumber(item.sortOrder),
      file,
    }
  })
}

function resolveMansionName(
  manifest: MigrationManifest,
  mansions: AndroidMansionJson[],
): string {
  const fromScope = manifest.scope.mansionName.trim()
  const fromMansion = mansions[0]?.name.trim() ?? ''
  return fromMansion || fromScope
}

function isSafePhotoPath(name: string): boolean {
  if (!name || name.startsWith('/') || name.includes('..') || name.includes('\\')) {
    return false
  }
  return /^photos\/[0-9]+_[0-9a-fA-F-]+\.[a-z0-9]+$/.test(name)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function asFiniteNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) {
    throw new MigrationZipError('移行データの形式が正しくありません')
  }
  return number
}
