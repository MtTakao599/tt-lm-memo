import type { StatusMasterItem } from '../types/master'
import type { Memo } from '../types/memo'
import { MemoCard } from './MemoCard'

type MemoListProps = {
  memos: Memo[]
  statuses: StatusMasterItem[]
  onOpen: (id: string) => void
}

export function MemoList({ memos, statuses, onOpen }: MemoListProps) {
  if (memos.length === 0) {
    return <p className="memo-empty">該当するメモはありません</p>
  }

  return (
    <div className="memo-list">
      {memos.map((memo) => (
        <MemoCard
          key={memo.id}
          memo={memo}
          statuses={statuses}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
