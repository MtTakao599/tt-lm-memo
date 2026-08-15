import type { MemoFilters } from '../types/filters'
import type { MasterItem, StatusMasterItem } from '../types/master'
import type { Memo, TabId } from '../types/memo'
import { isSameLocalDay } from './date'
import { enabledOptionNames, isTreatAsDone } from './masters'

export function filterMemos(
  memos: Memo[],
  tab: TabId,
  statuses: StatusMasterItem[],
): Memo[] {
  switch (tab) {
    case 'today':
      return memos.filter((memo) => isSameLocalDay(memo.createdAt))
    case 'handover':
      return memos.filter((memo) => memo.handover)
    case 'open':
      return memos.filter((memo) => !isTreatAsDone(memo.status, statuses))
    case 'all':
      return memos
    case 'free':
      return []
  }
}

export function sortByNewestCreated(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function matchesQuery(memo: Memo, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }

  return [memo.body, memo.building, memo.floor, memo.location, memo.category, memo.status]
    .some((value) => value.toLowerCase().includes(needle))
}

function matchesDetails(memo: Memo, filters: MemoFilters): boolean {
  if (filters.building && memo.building !== filters.building) {
    return false
  }
  if (filters.floor && memo.floor !== filters.floor) {
    return false
  }
  if (filters.location && memo.location !== filters.location) {
    return false
  }
  if (filters.category && memo.category !== filters.category) {
    return false
  }
  if (filters.status && memo.status !== filters.status) {
    return false
  }
  if (filters.handover === 'on' && !memo.handover) {
    return false
  }
  if (filters.handover === 'off' && memo.handover) {
    return false
  }
  return true
}

export function filterMemosBySearch(memos: Memo[], filters: MemoFilters): Memo[] {
  return memos.filter(
    (memo) => matchesQuery(memo, filters.query) && matchesDetails(memo, filters),
  )
}

export function mergeFilterChoices(
  items: MasterItem[],
  memoValues: string[],
): string[] {
  const enabled = enabledOptionNames(items)
  const known = new Set(enabled)
  const extras = [...new Set(memoValues.filter(Boolean))].filter(
    (value) => !known.has(value),
  )
  return [...enabled, ...extras]
}
