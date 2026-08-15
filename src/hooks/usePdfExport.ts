import { useState } from 'react'
import { toPdfExportMessage } from '../utils/pdf/pdfError'

export function usePdfExport() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(task: () => Promise<void>) {
    if (busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (caught) {
      setError(toPdfExportMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run }
}
