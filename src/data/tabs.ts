import type { TabId } from '../types/memo'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'open', label: '未対応' },
  { id: 'all', label: 'すべて' },
  { id: 'free', label: '自由メモ' },
  { id: 'handwritten', label: '手書きメモ' },
]

export function getTabLabel(tab: TabId): string {
  return TABS.find((item) => item.id === tab)?.label ?? tab
}
