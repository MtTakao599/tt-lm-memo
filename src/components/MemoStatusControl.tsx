import type { Status } from '../types/memo'
import { STATUSES } from '../data/formOptions'

type MemoStatusControlProps = {
  value: Status
  onChange: (status: Status) => void
}

const STATUS_CLASS: Record<Status, string> = {
  未対応: 'is-open',
  対応中: 'is-progress',
  完了: 'is-done',
}

export function MemoStatusControl({ value, onChange }: MemoStatusControlProps) {
  return (
    <div className="quick-control" role="group" aria-label="状態">
      {STATUSES.map((status) => {
        const selected = status === value
        return (
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            className={`quick-btn ${STATUS_CLASS[status]} ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(status)}
          >
            {status}
          </button>
        )
      })}
    </div>
  )
}
