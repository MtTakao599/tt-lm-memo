import type { Memo, TabId } from '../types/memo'
import { isSameLocalDay } from './date'

export function filterMemos(memos: Memo[], tab: TabId): Memo[] {
  switch (tab) {
    case 'today':
      return memos.filter((memo) => isSameLocalDay(memo.createdAt))
    case 'handover':
      return memos.filter((memo) => memo.handover)
    case 'open':
      return memos.filter(
        (memo) => memo.status === '未対応' || memo.status === '対応中',
      )
    case 'all':
      return memos
  }
}

export function sortByNewestCreated(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
