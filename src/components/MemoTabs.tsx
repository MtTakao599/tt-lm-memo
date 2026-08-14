import type { TabId } from '../types/memo'

const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'handover', label: '引き継ぎ' },
  { id: 'open', label: '未対応' },
  { id: 'all', label: 'すべて' },
]

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
