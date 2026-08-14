import type { TabId } from '../types/memo'
import { TABS } from '../data/tabs'

type MemoTabsProps = {
  value: TabId
  onChange: (tab: TabId) => void
}

export function MemoTabs({ value, onChange }: MemoTabsProps) {
  return (
    <div className="memo-tabs" role="tablist" aria-label="一覧の絞り込み">
      {TABS.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? 'memo-tab is-active' : 'memo-tab'}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
