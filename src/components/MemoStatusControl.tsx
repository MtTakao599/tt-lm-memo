import type { StatusMasterItem } from '../types/master'
import { optionsWithCurrent, statusToneClass } from '../utils/masters'

type MemoStatusControlProps = {
  value: string
  statuses: StatusMasterItem[]
  disabled?: boolean
  onChange: (status: string) => void
}

export function MemoStatusControl({
  value,
  statuses,
  disabled = false,
  onChange,
}: MemoStatusControlProps) {
  const names = optionsWithCurrent(statuses, value)

  return (
    <div className="quick-control" role="group" aria-label="状態">
      {names.map((status) => {
        const selected = status === value
        return (
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            className={`quick-btn ${statusToneClass(status, statuses)} ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(status)}
          >
            {status}
          </button>
        )
      })}
    </div>
  )
}
