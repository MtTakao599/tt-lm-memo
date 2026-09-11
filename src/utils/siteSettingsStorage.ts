import type { MasterItem, MasterSet, StatusMasterItem } from '../types/master'
import {
  SETTINGS_SCHEMA_VERSION,
  type StoredSiteSettings,
} from '../types/settingsShare'
import { parseSharedSettingsJson } from './settingsShare'

export const SITE_SETTINGS_STORAGE_KEY = 'lm-settings:tokyo-terrace'

export type LocalSiteSettings = {
  masters: MasterSet
  useBuilding: boolean
  useFloor: boolean
}

export function readLocalSiteSettings(): LocalSiteSettings | null {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return parseStoredSettings(parsed)
  } catch {
    return null
  }
}

export function saveSiteSettings(settings: {
  masters: MasterSet
  useBuilding: boolean
  useFloor: boolean
}) {
  const record: StoredSiteSettings = {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    useBuilding: settings.useBuilding,
    useFloor: settings.useFloor,
    masters: settings.masters,
  }
  localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(record))
}

function parseStoredSettings(
  value: unknown,
): LocalSiteSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const androidCompatible = parseAndroidCompatibleSettings(value)
  if (androidCompatible) {
    return androidCompatible
  }
  const record = value as Partial<StoredSiteSettings>
  if (record.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    return null
  }
  if (
    typeof record.useBuilding !== 'boolean' ||
    typeof record.useFloor !== 'boolean'
  ) {
    return null
  }
  if (!isMasterSet(record.masters)) {
    return null
  }
  return {
    masters: record.masters,
    useBuilding: record.useBuilding,
    useFloor: record.useFloor,
  }
}

function parseAndroidCompatibleSettings(
  value: unknown,
): LocalSiteSettings | null {
  try {
    const parsed = parseSharedSettingsJson(JSON.stringify(value))
    return {
      masters: parsed.masters,
      useBuilding: parsed.useBuilding,
      useFloor: parsed.useFloor,
    }
  } catch {
    return null
  }
}

function isMasterSet(value: unknown): value is MasterSet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const masters = value as Partial<MasterSet>
  return (
    isMasterList(masters.buildings) &&
    isMasterList(masters.floors) &&
    isMasterList(masters.locations) &&
    isMasterList(masters.categories) &&
    isStatusList(masters.statuses)
  )
}

function isMasterList(value: unknown): value is MasterItem[] {
  return Array.isArray(value) && value.length > 0 && value.every(isMasterItem)
}

function isStatusList(value: unknown): value is StatusMasterItem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (!isMasterItem(item)) {
        return false
      }
      return (
        'treatAsDone' in item &&
        typeof (item as StatusMasterItem).treatAsDone === 'boolean'
      )
    })
  )
}

function isMasterItem(value: unknown): value is MasterItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const item = value as Partial<MasterItem>
  return (
    typeof item.id === 'string' &&
    item.id !== '' &&
    typeof item.name === 'string' &&
    item.name !== '' &&
    typeof item.sortOrder === 'number' &&
    Number.isFinite(item.sortOrder) &&
    typeof item.enabled === 'boolean'
  )
}
