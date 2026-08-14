import type { MemoPhoto } from '../types/memo'

export const MAX_PHOTOS = 3
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.8

export function createPhoto(url: string, name: string): MemoPhoto {
  return {
    id: crypto.randomUUID(),
    name,
    url,
  }
}

export function revokePhotoUrl(photo: MemoPhoto) {
  if (photo.url.startsWith('blob:')) {
    URL.revokeObjectURL(photo.url)
  }
}

export function revokePhotoUrls(photos: MemoPhoto[]) {
  for (const photo of photos) {
    revokePhotoUrl(photo)
  }
}

export async function resizeImageFile(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('画像を処理できませんでした')
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvasToJpeg(canvas)
  return blob
}

export async function createResizedPhoto(file: File): Promise<MemoPhoto> {
  const blob = await resizeImageFile(file)
  const name = toJpegName(file.name)
  return createPhoto(URL.createObjectURL(blob), name)
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'photo'
  return `${base}.jpg`
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return createImageBitmap(file)
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('画像の圧縮に失敗しました'))
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
