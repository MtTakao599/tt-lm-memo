export type MemoFilters = {
  query: string
  building: string
  floor: string
  location: string
  category: string
  status: string
}

export const EMPTY_FILTERS: MemoFilters = {
  query: '',
  building: '',
  floor: '',
  location: '',
  category: '',
  status: '',
}

export function isFiltersActive(filters: MemoFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.building !== '' ||
    filters.floor !== '' ||
    filters.location !== '' ||
    filters.category !== '' ||
    filters.status !== ''
  )
}
