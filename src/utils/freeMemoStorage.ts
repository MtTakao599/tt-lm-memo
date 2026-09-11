import {
  freeMemoStorageKey,
  type FreeMemoRecord,
} from '../types/freeMemo'

export function readLocalFreeMemo(userId: string): FreeMemoRecord | null {
  try {
    const raw = localStorage.getItem(freeMemoStorageKey(userId))
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return parseLocalFreeMemo(parsed, userId)
  } catch {
    return null
  }
}

export function saveLocalFreeMemoBackup(record: FreeMemoRecord) {
  try {
    localStorage.setItem(
      freeMemoStorageKey(record.userId),
      JSON.stringify(record),
    )
  } catch {
    // バックアップ保存に失敗しても画面は継続する
  }
}

export function hasMigratableLocalFreeMemo(userId: string): boolean {
  const local = readLocalFreeMemo(userId)
  return Boolean(local && local.content.trim() !== '')
}

function parseLocalFreeMemo(
  value: unknown,
  userId: string,
): FreeMemoRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const record = value as Partial<FreeMemoRecord>
  if (record.userId !== userId) {
    return null
  }
  if (typeof record.content !== 'string') {
    return null
  }
  return {
    userId,
    content: record.content,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  }
}
