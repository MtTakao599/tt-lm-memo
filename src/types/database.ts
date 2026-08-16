export type ProfileNameEmbed = {
  display_name: string | null
}

export type MemoPhotoRow = {
  id: string
  memo_id: string
  storage_path: string
  sort_order: number
  created_by: string | null
  created_at: string
}

export type MemoRow = {
  id: string
  building: string
  floor: string
  location: string
  category: string
  status: string
  content: string
  include_in_handover: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type MemoRowWithRelations = MemoRow & {
  created_profile?: ProfileNameEmbed | ProfileNameEmbed[] | null
  updated_profile?: ProfileNameEmbed | ProfileNameEmbed[] | null
  memo_photos?: MemoPhotoRow[] | null
}

export type MemoInsert = {
  building: string
  floor: string
  location: string
  category: string
  status: string
  content: string
  include_in_handover: boolean
  created_by: string
  updated_by: string
}

export type MemoUpdate = {
  building?: string
  floor?: string
  location?: string
  category?: string
  status?: string
  content?: string
  include_in_handover?: boolean
}
