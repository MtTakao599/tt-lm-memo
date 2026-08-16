export type TabId = 'today' | 'handover' | 'open' | 'all' | 'free'

export type MemoPhoto = {
  id: string
  name: string
  url: string
  storagePath?: string
  blob?: Blob
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
  updatedByName: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  photos: MemoPhoto[]
}

export type MemoDraft = Omit<
  Memo,
  | 'id'
  | 'author'
  | 'updatedByName'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
>
