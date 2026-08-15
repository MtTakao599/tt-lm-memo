const AFTERPRINT_FALLBACK_MS = 60_000

export function printWithDocumentTitle(
  title: string,
  restoreTitle = document.title,
): () => void {
  let restored = false
  let startId = 0
  let fallbackId = 0

  const restore = () => {
    if (restored) {
      return
    }
    restored = true
    document.title = restoreTitle
    window.removeEventListener('afterprint', restore)
    window.clearTimeout(startId)
    window.clearTimeout(fallbackId)
  }

  document.title = title
  window.addEventListener('afterprint', restore)

  startId = window.setTimeout(() => {
    if (restored) {
      return
    }
    window.print()
    fallbackId = window.setTimeout(restore, AFTERPRINT_FALLBACK_MS)
  }, 0)

  return restore
}
