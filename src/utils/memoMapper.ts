import type { Memo, MemoPhoto } from '../types/memo'
import type {
  MemoPhotoRow,
  MemoRowWithRelations,
  ProfileNameEmbed,
} from '../types/database'

function embedDisplayName(
  value: ProfileNameEmbed | ProfileNameEmbed[] | null | undefined,
): string {
  if (!value) {
    return ''
  }
  const row = Array.isArray(value) ? value[0] : value
  return row?.display_name?.trim() ?? ''
}

export function mapPhotoRow(row: MemoPhotoRow): MemoPhoto {
  const fileName = row.storage_path.split('/').pop() ?? 'photo.jpg'
  return {
    id: row.id,
    name: fileName,
    url: '',
    storagePath: row.storage_path,
  }
}

export function mapMemoRow(
  row: MemoRowWithRelations,
  profileNames: Map<string, string> = new Map(),
): Memo {
  const photos = [...(row.memo_photos ?? [])]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(mapPhotoRow)

  const author =
    embedDisplayName(row.created_profile) ||
    profileNames.get(row.created_by) ||
    '不明'
  const updatedByName =
    embedDisplayName(row.updated_profile) ||
    profileNames.get(row.updated_by) ||
    '不明'

  return {
    id: row.id,
    building: row.building,
    floor: row.floor,
    location: row.location,
    category: row.category,
    status: row.status,
    body: row.content,
    handover: row.include_in_handover,
    author,
    updatedByName,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos,
  }
}

export function draftToMemoInsert(
  draft: {
    building: string
    floor: string
    location: string
    category: string
    status: string
    body: string
  },
  userId: string,
) {
  return {
    building: draft.building,
    floor: draft.floor,
    location: draft.location,
    category: draft.category,
    status: draft.status,
    content: draft.body,
    include_in_handover: false,
    created_by: userId,
    updated_by: userId,
  }
}

export function draftToMemoUpdate(draft: {
  building: string
  floor: string
  location: string
  category: string
  status: string
  body: string
}) {
  return {
    building: draft.building,
    floor: draft.floor,
    location: draft.location,
    category: draft.category,
    status: draft.status,
    content: draft.body,
  }
}

export function mergeLoadedMemo(next: Memo, current: Memo | undefined): Memo {
  if (!current) {
    return next
  }
  const previous = new Map(current.photos.map((photo) => [photo.id, photo]))
  return {
    ...next,
    author: next.author === '不明' ? current.author : next.author,
    updatedByName:
      next.updatedByName === '不明' ? current.updatedByName : next.updatedByName,
    photos: next.photos.map((photo) => {
      const prev = previous.get(photo.id)
      if (prev?.url && !photo.url) {
        return { ...photo, url: prev.url, blob: prev.blob }
      }
      return photo
    }),
  }
}
