import type { Memo } from '../types/memo'
import { formatMemoDate } from '../utils/date'

type MemoCardProps = {
  memo: Memo
  onOpen: (id: string) => void
}

const STATUS_CLASS: Record<Memo['status'], string> = {
  未対応: 'is-open',
  対応中: 'is-progress',
  完了: 'is-done',
}

export function MemoCard({ memo, onOpen }: MemoCardProps) {
  return (
    <button
      type="button"
      className="memo-card"
      onClick={() => onOpen(memo.id)}
    >
      <div className="memo-card-top">
        <p className="memo-card-place">
          {memo.building}
          <span className="memo-card-sep">／</span>
          {memo.floor}
          <span className="memo-card-sep">／</span>
          {memo.location}
        </p>
        <span className={`status-badge ${STATUS_CLASS[memo.status]}`}>
          {memo.status}
        </span>
      </div>

      <div className="memo-card-meta">
        <span className="category-badge">{memo.category}</span>
        {memo.handover ? (
          <span className="handover-badge">引き継ぎON</span>
        ) : null}
      </div>

      <p className="memo-card-body">{memo.body}</p>

      <p className="memo-card-foot">
        {memo.author}
        <span className="memo-card-sep">・</span>
        {formatMemoDate(memo.createdAt)}
      </p>
    </button>
  )
}
