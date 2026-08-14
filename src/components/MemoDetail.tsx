import type { Memo, Status } from '../types/memo'
import { formatMemoDate } from '../utils/date'
import { MemoPhotoViewer } from './MemoPhotoViewer'
import { MemoStatusControl } from './MemoStatusControl'

type MemoDetailProps = {
  memo: Memo
  onBack: () => void
  onEdit: () => void
  onStatusChange: (status: Status) => void
  onHandoverChange: (handover: boolean) => void
}

export function MemoDetail({
  memo,
  onBack,
  onEdit,
  onStatusChange,
  onHandoverChange,
}: MemoDetailProps) {
  return (
    <section className="memo-detail">
      <button type="button" className="back-link" onClick={onBack}>
        ← 一覧へ戻る
      </button>

      <button type="button" className="btn btn-primary detail-edit-btn" onClick={onEdit}>
        編集
      </button>

      <div className="detail-panel">
        <p className="detail-place">
          {memo.building}
          <span className="memo-card-sep">／</span>
          {memo.floor}
          <span className="memo-card-sep">／</span>
          {memo.location}
        </p>

        <div className="memo-card-meta">
          <span className="category-badge">{memo.category}</span>
        </div>

        <div className="detail-section">
          <p className="detail-label">状態</p>
          <MemoStatusControl value={memo.status} onChange={onStatusChange} />
        </div>

        <div className="detail-section">
          <p className="detail-label">引き継ぎ</p>
          <div className="quick-control is-two" role="group" aria-label="引き継ぎ">
            <button
              type="button"
              aria-pressed={memo.handover}
              className={`quick-btn is-handover ${memo.handover ? 'is-selected' : ''}`}
              onClick={() => onHandoverChange(true)}
            >
              引き継ぎON
            </button>
            <button
              type="button"
              aria-pressed={!memo.handover}
              className={`quick-btn ${!memo.handover ? 'is-selected' : ''}`}
              onClick={() => onHandoverChange(false)}
            >
              引き継ぎOFF
            </button>
          </div>
        </div>

        <div className="detail-section">
          <p className="detail-label">本文</p>
          <p className="detail-body">{memo.body}</p>
        </div>

        <MemoPhotoViewer photos={memo.photos} />

        <dl className="detail-meta">
          <div>
            <dt>登録者</dt>
            <dd>{memo.author}</dd>
          </div>
          <div>
            <dt>登録日時</dt>
            <dd>{formatMemoDate(memo.createdAt)}</dd>
          </div>
          <div>
            <dt>更新日時</dt>
            <dd>{formatMemoDate(memo.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
