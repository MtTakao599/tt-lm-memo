import { PdfExportError } from './pdfError'

export const JAPANESE_FONT_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf'

const FONT_CACHE_NAME = 'lm-memo-pdf-fonts-v1'

let memoryCache: ArrayBuffer | null = null
let inflight: Promise<ArrayBuffer> | null = null

export async function loadJapaneseFontBytes(): Promise<Uint8Array> {
  if (memoryCache) {
    return new Uint8Array(memoryCache)
  }
  if (!inflight) {
    inflight = fetchJapaneseFont()
  }
  try {
    const buffer = await inflight
    return new Uint8Array(buffer)
  } finally {
    inflight = null
  }
}

async function fetchJapaneseFont(): Promise<ArrayBuffer> {
  try {
    if ('caches' in window) {
      const cache = await caches.open(FONT_CACHE_NAME)
      const cached = await cache.match(JAPANESE_FONT_URL)
      if (cached) {
        memoryCache = await cached.arrayBuffer()
        return memoryCache
      }

      const response = await fetch(JAPANESE_FONT_URL, {
        mode: 'cors',
        credentials: 'omit',
      })
      if (!response.ok) {
        throw new Error('font-http')
      }
      await cache.put(JAPANESE_FONT_URL, response.clone())
      memoryCache = await response.arrayBuffer()
      return memoryCache
    }

    const response = await fetch(JAPANESE_FONT_URL, {
      mode: 'cors',
      credentials: 'omit',
    })
    if (!response.ok) {
      throw new Error('font-http')
    }
    memoryCache = await response.arrayBuffer()
    return memoryCache
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error
    }
    throw new PdfExportError('PDF用フォントを読み込めませんでした')
  }
}
