import type { Memo } from '../types/memo'

function dateAt(hour: number, minute: number, daysAgo = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function dummyMemo(
  memo: Omit<Memo, 'createdAt' | 'updatedAt' | 'photos'> & {
    createdAt: string
    photos?: Memo['photos']
  },
): Memo {
  return {
    photos: [],
    ...memo,
    updatedAt: memo.createdAt,
  }
}

export const dummyMemos: Memo[] = [
  dummyMemo({
    id: 'dummy-1',
    building: 'A棟',
    floor: '3F',
    location: '共用廊下',
    category: '設備',
    status: '未対応',
    body: '廊下照明1灯が点灯していない',
    handover: true,
    author: '小石',
    createdAt: dateAt(9, 20),
  }),
  dummyMemo({
    id: 'dummy-2',
    building: 'J棟',
    floor: '1F',
    location: 'エントランス',
    category: '清掃',
    status: '対応中',
    body: '床に汚れあり。清掃へ連絡済み',
    handover: true,
    author: '山田',
    createdAt: dateAt(10, 45),
  }),
  dummyMemo({
    id: 'dummy-3',
    building: '共用棟',
    floor: '1F',
    location: '管理センター',
    category: 'その他',
    status: '完了',
    body: '宅配業者からの問い合わせ対応済み',
    handover: false,
    author: '小石',
    createdAt: dateAt(11, 30),
  }),
  dummyMemo({
    id: 'dummy-4',
    building: 'AE棟',
    floor: '2F',
    location: 'エレベーターホール',
    category: '設備',
    status: '未対応',
    body: 'エレベーター前の照明が暗い。電球交換を依頼したい',
    handover: true,
    author: '佐藤',
    createdAt: dateAt(8, 10),
  }),
  dummyMemo({
    id: 'dummy-5',
    building: 'B棟',
    floor: '1F',
    location: 'ゴミ置場',
    category: '清掃',
    status: '未対応',
    body: '分別が守られていないゴミが残っている',
    handover: false,
    author: '山田',
    createdAt: dateAt(17, 40, 1),
  }),
]
