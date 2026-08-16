import { createInitialMasters } from '../data/initialMasters'
import type { MasterItem, MasterSet, StatusMasterItem } from '../types/master'
import {
  SETTINGS_SCHEMA_VERSION,
  type StoredSiteSettings,
} from '../types/settingsShare'

export const SITE_SETTINGS_STORAGE_KEY = 'lm-settings:tokyo-terrace'

export type LoadedSiteSettings = {
  masters: MasterSet
  useBuilding: boolean
  useFloor: boolean
  usedFallback: boolean
}

export function loadSiteSettings(): LoadedSiteSettings {
  const fallback: LoadedSiteSettings = {
    masters: createInitialMasters(),
    useBuilding: true,
    useFloor: true,
    usedFallback: true,
  }

  try {
    const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY)
    if (!raw) {
      return { ...fallback, usedFallback: false }
    }

    const parsed: unknown = JSON.parse(raw)
    const settings = parseStoredSettings(parsed)
    if (!settings) {
      return fallback
    }
    return { ...settings, usedFallback: false }
  } catch {
    return fallback
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
): Omit<LoadedSiteSettings, 'usedFallback'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
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
