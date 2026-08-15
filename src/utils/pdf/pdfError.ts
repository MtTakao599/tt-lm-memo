export class PdfExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfExportError'
  }
}

export function toPdfExportMessage(error: unknown): string {
  if (error instanceof PdfExportError) {
    return error.message
  }
  return 'PDFの作成に失敗しました'
}
