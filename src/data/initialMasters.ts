import type { MasterItem, MasterSet, StatusMasterItem } from '../types/master'

const BUILDING_NAMES = [
  'AE棟',
  'AW棟',
  'B棟',
  'C棟',
  'D棟',
  'E棟',
  'F棟',
  'G棟',
  'H棟',
  'I棟',
  'J棟',
  '共用棟',
]

const FLOOR_NAMES = [
  'B1F',
  '1F',
  '2F',
  '3F',
  '4F',
  '5F',
  '6F',
  '7F',
  '8F',
  '9F',
  '10F',
  '11F',
  '12F',
  '13F',
  '14F',
  'その他',
]

const LOCATION_NAMES = [
  'エントランス',
  '共用廊下',
  'エレベーターホール',
  '駐車場',
  '駐輪場',
  'ゴミ置場',
  '管理センター',
  'その他',
]

const CATEGORY_NAMES = [
  '設備',
  '清掃',
  '警備',
  '居住者対応',
  '業者対応',
  'その他',
]

function itemsFrom(names: readonly string[], prefix: string): MasterItem[] {
  return names.map((name, index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    sortOrder: index,
    enabled: true,
  }))
}

function statusItems(): StatusMasterItem[] {
  return [
    { id: 'status-1', name: '未対応', sortOrder: 0, enabled: true, treatAsDone: false },
    { id: 'status-2', name: '対応中', sortOrder: 1, enabled: true, treatAsDone: false },
    { id: 'status-3', name: '完了', sortOrder: 2, enabled: true, treatAsDone: true },
  ]
}

export function createInitialMasters(): MasterSet {
  return {
    buildings: itemsFrom(BUILDING_NAMES, 'building'),
    floors: itemsFrom(FLOOR_NAMES, 'floor'),
    locations: itemsFrom(LOCATION_NAMES, 'location'),
    categories: itemsFrom(CATEGORY_NAMES, 'category'),
    statuses: statusItems(),
  }
}
