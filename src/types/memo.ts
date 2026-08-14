export type Status = '未対応' | '対応中' | '完了'

export type TabId = 'today' | 'handover' | 'open' | 'all'

export type Memo = {
  id: string
  building: string
  floor: string
  location: string
  category: string
  status: Status
  body: string
  handover: boolean
  author: string
  createdAt: string
}

export type MemoDraft = Omit<Memo, 'id' | 'author' | 'createdAt'>
