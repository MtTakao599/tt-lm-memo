import type { StatusMasterItem } from '../types/master'
import type { Memo } from '../types/memo'
import { formatMemoDate } from '../utils/date'
import { statusToneClass } from '../utils/masters'

type MemoCardProps = {
  memo: Memo
  statuses: StatusMasterItem[]
  onOpen: (id: string) => void
}

export function MemoCard({ memo, statuses, onOpen }: MemoCardProps) {
  const firstPhoto = memo.photos[0]

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
        <span className={`status-badge ${statusToneClass(memo.status, statuses)}`}>
          {memo.status}
        </span>
      </div>

      <div className="memo-card-meta">
        <span className="category-badge">{memo.category}</span>
        {memo.handover ? (
          <span className="handover-badge">引き継ぎON</span>
        ) : null}
      </div>

      <div className="memo-card-main">
        <p className="memo-card-body">{memo.body}</p>
        {firstPhoto ? (
          <div className="memo-card-photo">
            <img src={firstPhoto.url} alt="" />
            <span>写真 {memo.photos.length}枚</span>
          </div>
        ) : null}
      </div>

      <p className="memo-card-foot">
        {memo.author}
        <span className="memo-card-sep">・</span>
        {formatMemoDate(memo.createdAt)}
      </p>
    </button>
  )
}
