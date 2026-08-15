function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function toLocalDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function formatPdfFileDate(value: Date | string = new Date()): string {
  const date = toLocalDate(value)
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}

export function formatPdfFileDateTime(value: Date | string): string {
  const date = toLocalDate(value)
  return `${formatPdfFileDate(date)}_${pad2(date.getHours())}${pad2(date.getMinutes())}`
}

export function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\r\n\t]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function joinFileNameParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ? sanitizeFileNamePart(part) : ''))
    .filter(Boolean)
    .join('_')
    .replace(/_+/g, '_')
}

export function buildSingleMemoPdfTitle(input: {
  propertyName: string
  building: string
  location: string
  createdAt: Date | string
}): string {
  return joinFileNameParts([
    '管理人メモ',
    input.propertyName,
    input.building,
    input.location,
    formatPdfFileDateTime(input.createdAt),
  ])
}

export function buildHandoverPdfTitle(now: Date | string = new Date()): string {
  return `handover_${formatPdfFileDate(now)}`
}
