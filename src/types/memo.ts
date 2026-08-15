export type TabId = 'today' | 'handover' | 'open' | 'all' | 'free'

export type MemoPhoto = {
  id: string
  name: string
  url: string
}

export type Memo = {
  id: string
  building: string
  floor: string
  location: string
  category: string
  status: string
  body: string
  handover: boolean
  author: string
  createdAt: string
  updatedAt: string
  photos: MemoPhoto[]
}

export type MemoDraft = Omit<Memo, 'id' | 'author' | 'createdAt' | 'updatedAt'>
