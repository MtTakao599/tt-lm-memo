import type { Memo, MemoPhoto } from '../types/memo'
import { revokePhotoUrl } from './photos'

export function deleteMemoById(
  memos: Memo[],
  id: string,
  formPhotos: MemoPhoto[] = [],
): Memo[] {
  const target = memos.find((memo) => memo.id === id)
  if (!target) {
    return memos
  }

  const revokedIds = new Set<string>()

  for (const photo of target.photos) {
    revokePhotoUrl(photo)
    revokedIds.add(photo.id)
  }

  for (const photo of formPhotos) {
    if (!revokedIds.has(photo.id)) {
      revokePhotoUrl(photo)
      revokedIds.add(photo.id)
    }
  }

  return memos.filter((memo) => memo.id !== id)
}
