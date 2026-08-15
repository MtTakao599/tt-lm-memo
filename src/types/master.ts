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
