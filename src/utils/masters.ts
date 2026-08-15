import type { MasterItem, StatusMasterItem } from '../types/master'

export function sortMasters<T extends MasterItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function normalizeSortOrder<T extends MasterItem>(items: T[]): T[] {
  return sortMasters(items).map((item, index) => ({
    ...item,
    sortOrder: index,
  }))
}

export function enabledOptionNames<T extends MasterItem>(items: T[]): string[] {
  return sortMasters(items)
    .filter((item) => item.enabled)
    .map((item) => item.name)
}

export function optionsWithCurrent<T extends MasterItem>(
  items: T[],
  current: string,
): string[] {
  const enabled = enabledOptionNames(items)
  if (current && !enabled.includes(current)) {
    return [current, ...enabled]
  }
  return enabled
}

export function defaultStatusName(statuses: StatusMasterItem[]): string {
  const enabled = sortMasters(statuses).filter((item) => item.enabled)
  return enabled.find((item) => !item.treatAsDone)?.name ?? enabled[0]?.name ?? ''
}

export function isTreatAsDone(
  status: string,
  statuses: StatusMasterItem[],
): boolean {
  return statuses.find((item) => item.name === status)?.treatAsDone ?? false
}

export function statusToneClass(
  status: string,
  statuses: StatusMasterItem[],
): string {
  if (isTreatAsDone(status, statuses)) {
    return 'is-done'
  }
  if (status === '対応中') {
    return 'is-progress'
  }
  return 'is-open'
}

type MasterChange<T extends MasterItem> = {
  items: T[]
  error?: string
}

export function addMasterItem<T extends MasterItem>(
  items: T[],
  name: string,
  extra?: Record<string, unknown>,
): MasterChange<T> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { items, error: '名前を入力してください' }
  }
  if (items.some((item) => item.name === trimmed)) {
    return { items, error: '同じ名前の項目が既にあります' }
  }

  const nextItem = {
    id: crypto.randomUUID(),
    name: trimmed,
    sortOrder: items.length,
    enabled: true,
    ...extra,
  } as T

  return { items: normalizeSortOrder([...items, nextItem]) }
}

export function renameMasterItem<T extends MasterItem>(
  items: T[],
  id: string,
  name: string,
): MasterChange<T> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { items, error: '名前を入力してください' }
  }
  if (items.some((item) => item.id !== id && item.name === trimmed)) {
    return { items, error: '同じ名前の項目が既にあります' }
  }

  return {
    items: items.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item,
    ),
  }
}

export function setMasterEnabled<T extends MasterItem>(
  items: T[],
  id: string,
  enabled: boolean,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, enabled } : item))
}

export function moveMasterItem<T extends MasterItem>(
  items: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const sorted = normalizeSortOrder(items)
  const index = sorted.findIndex((item) => item.id === id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
    return sorted
  }

  const next = [...sorted]
  const current = next[index]
  const swap = next[nextIndex]
  if (!current || !swap) {
    return sorted
  }
  next[index] = swap
  next[nextIndex] = current
  return normalizeSortOrder(next)
}

export function setTreatAsDone(
  items: StatusMasterItem[],
  id: string,
  treatAsDone: boolean,
): StatusMasterItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, treatAsDone } : item,
  )
}
