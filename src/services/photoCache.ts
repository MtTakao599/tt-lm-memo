import { supabase } from '../lib/supabase'
import { AppError, logError } from '../utils/appError'

const urls = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export async function getPhotoObjectUrl(storagePath: string): Promise<string> {
  const cached = urls.get(storagePath)
  if (cached) {
    return cached
  }

  const pending = inflight.get(storagePath)
  if (pending) {
    return pending
  }

  const request = downloadPhoto(storagePath)
  inflight.set(storagePath, request)
  try {
    const url = await request
    urls.set(storagePath, url)
    return url
  } finally {
    inflight.delete(storagePath)
  }
}

async function downloadPhoto(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('memo-photos')
    .download(storagePath)
  if (error || !data) {
    logError('photo download', error)
    throw new AppError('写真を読み込めませんでした')
  }
  return URL.createObjectURL(data)
}

export function revokePhotoCache(storagePath: string) {
  const url = urls.get(storagePath)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(storagePath)
  }
}

export function revokePhotoCaches(storagePaths: string[]) {
  for (const path of storagePaths) {
    revokePhotoCache(path)
  }
}
