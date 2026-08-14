import type { TabId } from '../types/memo'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'handover', label: '引き継ぎ' },
  { id: 'open', label: '未対応' },
  { id: 'all', label: 'すべて' },
]

export function getTabLabel(tab: TabId): string {
  return TABS.find((item) => item.id === tab)?.label ?? tab
}
