import { PROPERTY_NAME } from '../constants'
import type { MasterItem, MasterSet, StatusMasterItem } from '../types/master'
import {
  ANDROID_SETTINGS_APP,
  SETTINGS_SCHEMA_VERSION,
  WEB_SETTINGS_APP,
  type ParsedSharedSettings,
  type SharedMasterItem,
  type SharedMasterType,
  type SharedSettingsJson,
} from '../types/settingsShare'
import { assignSortOrder } from './masters'
import { formatPdfFileDate, sanitizeFileNamePart } from './pdfFileName'

const KNOWN_TYPES = new Set<SharedMasterType>([
  'building',
  'floor',
  'place',
  'category',
  'status',
])

const DEFAULT_DONE_STATUSES = new Set(['対応済み'])

export class SettingsShareError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettingsShareError'
  }
}

export function buildSharedSettingsJson(
  masters: MasterSet,
  flags: { useBuilding: boolean; useFloor: boolean },
): SharedSettingsJson {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    app: ANDROID_SETTINGS_APP,
    mansion: {
      name: PROPERTY_NAME,
      useBuilding: flags.useBuilding,
      useFloor: flags.useFloor,
      items: [
        ...toSharedItems('building', masters.buildings),
        ...toSharedItems('floor', masters.floors),
        ...toSharedItems('place', masters.locations),
        ...toSharedItems('category', masters.categories),
        ...toSharedItems('status', masters.statuses),
      ],
    },
  }
}

export function settingsExportFileName(now = new Date()): string {
  const mansion = sanitizeFileNamePart(PROPERTY_NAME) || 'マンション'
  return `管理人メモ_設定_${mansion}_${formatPdfFileDate(now)}.json`
}

export function downloadSettingsJson(json: SharedSettingsJson) {
  const text = `${JSON.stringify(json, null, 2)}\n`
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = settingsExportFileName()
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

export function parseSharedSettingsJson(raw: string): ParsedSharedSettings {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SettingsShareError(
      '設定ファイルの形式が正しくありません。JSON形式のファイルを選択してください。',
    )
  }

  if (!isRecord(parsed)) {
    throw new SettingsShareError('設定ファイルの形式が正しくありません。')
  }

  if (parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    throw new SettingsShareError(
      '設定ファイルの形式が違います。このアプリのバージョンに対応していません。',
    )
  }

  const app = parsed.app
  if (
    app !== undefined &&
    app !== '' &&
    app !== ANDROID_SETTINGS_APP &&
    app !== WEB_SETTINGS_APP
  ) {
    throw new SettingsShareError('管理人メモ用の設定ファイルではありません')
  }

  if (!isRecord(parsed.mansion)) {
    throw new SettingsShareError(
      '必須項目がありません。マンション設定（mansion）が見つかりません。',
    )
  }

  const mansion = parsed.mansion
  const mansionName =
    typeof mansion.name === 'string' ? mansion.name.trim() : ''
  if (!mansionName) {
    throw new SettingsShareError(
      '必須項目がありません。マンション名が設定されていません。',
    )
  }

  if (
    typeof mansion.useBuilding !== 'boolean' ||
    typeof mansion.useFloor !== 'boolean'
  ) {
    throw new SettingsShareError(
      '必須項目がありません。棟・階の表示設定が不足しています。',
    )
  }

  if (!Array.isArray(mansion.items) || mansion.items.length === 0) {
    throw new SettingsShareError(
      '必須項目がありません。設定項目（items）が見つかりません。',
    )
  }

  const grouped = {
    building: [] as Array<SharedMasterItem & { sourceIndex: number }>,
    floor: [] as Array<SharedMasterItem & { sourceIndex: number }>,
    place: [] as Array<SharedMasterItem & { sourceIndex: number }>,
    category: [] as Array<SharedMasterItem & { sourceIndex: number }>,
    status: [] as Array<SharedMasterItem & { sourceIndex: number }>,
  }

  mansion.items.forEach((item, index) => {
    const parsedItem = parseSharedItem(item, index)
    if (!parsedItem) {
      return
    }
    grouped[parsedItem.type].push({ ...parsedItem, sourceIndex: index })
  })

  const total =
    grouped.building.length +
    grouped.floor.length +
    grouped.place.length +
    grouped.category.length +
    grouped.status.length
  if (total === 0) {
    throw new SettingsShareError(
      '取り込める設定項目がありません。棟・階・場所・区分・状態の項目を確認してください。',
    )
  }

  if (
    grouped.building.length === 0 ||
    grouped.floor.length === 0 ||
    grouped.place.length === 0 ||
    grouped.category.length === 0 ||
    grouped.status.length === 0
  ) {
    throw new SettingsShareError(
      '棟・階・場所・区分・状態のいずれかの項目が不足しています。',
    )
  }

  return {
    mansionName,
    useBuilding: mansion.useBuilding,
    useFloor: mansion.useFloor,
    masters: {
      buildings: toMasterItems(grouped.building),
      floors: toMasterItems(grouped.floor),
      locations: toMasterItems(grouped.place),
      categories: toMasterItems(grouped.category),
      statuses: toStatusItems(grouped.status),
    },
    counts: {
      building: grouped.building.length,
      floor: grouped.floor.length,
      location: grouped.place.length,
      category: grouped.category.length,
      status: grouped.status.length,
    },
  }
}

function toSharedItems(
  type: SharedMasterType,
  items: Array<MasterItem | StatusMasterItem>,
): SharedMasterItem[] {
  return items.map((item) => ({
    type,
    name: item.name,
    sortOrder: item.sortOrder,
    enabled: item.enabled,
    treatAsDone: 'treatAsDone' in item ? item.treatAsDone : false,
  }))
}

function parseSharedItem(
  value: unknown,
  index: number,
): SharedMasterItem | null {
  if (!isRecord(value)) {
    throw new SettingsShareError('設定項目の形式が正しくありません')
  }

  const type = typeof value.type === 'string' ? value.type.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!type || !name) {
    throw new SettingsShareError(
      '必須項目がありません。設定項目の種類（type）または名前（name）が不足しています。',
    )
  }
  if (!isSharedMasterType(type)) {
    return null
  }

  if (value.sortOrder !== undefined && !isFiniteNumber(value.sortOrder)) {
    throw new SettingsShareError('設定項目の並び順（sortOrder）が正しくありません。')
  }
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') {
    throw new SettingsShareError('設定項目の有効／無効（enabled）が正しくありません。')
  }
  if (
    value.treatAsDone !== undefined &&
    typeof value.treatAsDone !== 'boolean'
  ) {
    throw new SettingsShareError(
      '設定項目の完了扱い（treatAsDone）が正しくありません。',
    )
  }

  return {
    type,
    name,
    sortOrder: isFiniteNumber(value.sortOrder) ? value.sortOrder : index,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    treatAsDone:
      typeof value.treatAsDone === 'boolean'
        ? value.treatAsDone
        : type === 'status' && DEFAULT_DONE_STATUSES.has(name),
  }
}

function toMasterItems(
  items: Array<SharedMasterItem & { sourceIndex: number }>,
): MasterItem[] {
  assertUniqueNames(items)
  return assignSortOrder(
    sortByOrder(items).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      sortOrder: item.sortOrder,
      enabled: item.enabled,
    })),
  )
}

function toStatusItems(
  items: Array<SharedMasterItem & { sourceIndex: number }>,
): StatusMasterItem[] {
  assertUniqueNames(items)
  return assignSortOrder(
    sortByOrder(items).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      sortOrder: item.sortOrder,
      enabled: item.enabled,
      treatAsDone: item.treatAsDone,
    })),
  )
}

function assertUniqueNames(
  items: Array<SharedMasterItem & { sourceIndex: number }>,
) {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.name)) {
      throw new SettingsShareError(
        `同じ種類に「${item.name}」が重複しています。`,
      )
    }
    seen.add(item.name)
  }
}

function sortByOrder<T extends { sortOrder: number; sourceIndex: number }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }
    return left.sourceIndex - right.sourceIndex
  })
}

function isSharedMasterType(value: string): value is SharedMasterType {
  return KNOWN_TYPES.has(value as SharedMasterType)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
