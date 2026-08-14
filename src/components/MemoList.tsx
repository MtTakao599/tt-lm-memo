import type { Memo } from '../types/memo'
import { MemoCard } from './MemoCard'

type MemoListProps = {
  memos: Memo[]
}

export function MemoList({ memos }: MemoListProps) {
  if (memos.length === 0) {
    return <p className="memo-empty">該当するメモはありません</p>
  }

  return (
    <div className="memo-list">
      {memos.map((memo) => (
        <MemoCard key={memo.id} memo={memo} />
      ))}
    </div>
  )
}
