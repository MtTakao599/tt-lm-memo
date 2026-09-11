export type MasterCategory =
  | 'building'
  | 'floor'
  | 'location'
  | 'category'
  | 'status'

export type MasterItem = {
  id: string
  name: string
  sortOrder: number
  enabled: boolean
}

export type StatusMasterItem = MasterItem & {
  treatAsDone: boolean
}

export type MasterSet = {
  buildings: MasterItem[]
  floors: MasterItem[]
  locations: MasterItem[]
  categories: MasterItem[]
  statuses: StatusMasterItem[]
}

export type SiteMasterSettings = {
  masters: MasterSet
  useBuilding: boolean
  useFloor: boolean
}

export function emptyMasterSet(): MasterSet {
  return {
    buildings: [],
    floors: [],
    locations: [],
    categories: [],
    statuses: [],
  }
}
