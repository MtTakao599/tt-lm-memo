import type { MemoMasterItemRow } from '../types/database'
import type {
  MasterCategory,
  MasterItem,
  MasterSet,
  StatusMasterItem,
} from '../types/master'
import { emptyMasterSet } from '../types/master'
import { sortMasters } from './masters'

export type MasterDbType = 'building' | 'floor' | 'place' | 'category' | 'status'

export function uiCategoryToDbType(category: MasterCategory): MasterDbType {
  return category === 'location' ? 'place' : category
}

export function dbTypeToUiCategory(type: MasterDbType): MasterCategory {
  return type === 'place' ? 'location' : type
}

export function mapMasterRow(row: MemoMasterItemRow): MasterItem | StatusMasterItem {
  const base: MasterItem = {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    enabled: row.enabled,
  }
  if (row.type === 'status') {
    return { ...base, treatAsDone: row.treat_as_done }
  }
  return base
}

export function rowsToMasterSet(rows: MemoMasterItemRow[]): MasterSet {
  const next = emptyMasterSet()
  for (const row of rows) {
    const item = mapMasterRow(row)
    switch (row.type) {
      case 'building':
        next.buildings.push(item)
        break
      case 'floor':
        next.floors.push(item)
        break
      case 'place':
        next.locations.push(item)
        break
      case 'category':
        next.categories.push(item)
        break
      case 'status':
        next.statuses.push(item as StatusMasterItem)
        break
    }
  }
  return {
    buildings: sortMasters(next.buildings),
    floors: sortMasters(next.floors),
    locations: sortMasters(next.locations),
    categories: sortMasters(next.categories),
    statuses: sortMasters(next.statuses),
  }
}

export function masterSetToReplacePayload(masters: MasterSet) {
  return [
    ...toPayload('building', masters.buildings),
    ...toPayload('floor', masters.floors),
    ...toPayload('place', masters.locations),
    ...toPayload('category', masters.categories),
    ...toPayload('status', masters.statuses),
  ]
}

function toPayload(type: MasterDbType, items: MasterItem[]) {
  return sortMasters(items).map((item, index) => ({
    type,
    name: item.name,
    sort_order: index,
    enabled: item.enabled,
    treat_as_done:
      'treatAsDone' in item ? Boolean((item as StatusMasterItem).treatAsDone) : false,
  }))
}
