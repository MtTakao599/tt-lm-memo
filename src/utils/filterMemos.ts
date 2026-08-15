import type { StatusMasterItem } from '../types/master'
import type { Memo, TabId } from '../types/memo'
import { isSameLocalDay } from './date'
import { isTreatAsDone } from './masters'

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
  }
}

export function sortByNewestCreated(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
