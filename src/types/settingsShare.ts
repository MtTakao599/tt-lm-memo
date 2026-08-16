import type { MasterSet } from './master'

export const SETTINGS_SCHEMA_VERSION = 1
export const ANDROID_SETTINGS_APP = 'KanrininMemo'
export const WEB_SETTINGS_APP = 'LMMemo'

export type SettingsAppName =
  | typeof ANDROID_SETTINGS_APP
  | typeof WEB_SETTINGS_APP

export type SharedMasterType =
  | 'building'
  | 'floor'
  | 'place'
  | 'category'
  | 'status'

export type SharedMasterItem = {
  type: SharedMasterType
  name: string
  sortOrder: number
  enabled: boolean
  treatAsDone: boolean
}

export type SharedSettingsJson = {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION
  app: SettingsAppName
  mansion: {
    name: string
    useBuilding: boolean
    useFloor: boolean
    items: SharedMasterItem[]
  }
}

export type ParsedSharedSettings = {
  mansionName: string
  useBuilding: boolean
  useFloor: boolean
  masters: MasterSet
  counts: {
    building: number
    floor: number
    location: number
    category: number
    status: number
  }
}

export type StoredSiteSettings = {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION
  updatedAt: string
  useBuilding: boolean
  useFloor: boolean
  masters: MasterSet
}
