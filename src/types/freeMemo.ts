export type FreeMemoRecord = {
  userId: string
  content: string
  updatedAt: string
}

export function freeMemoStorageKey(userId: string) {
  return `lm-free-memo:${userId}`
}
