export type HandwrittenTool = 'pen' | 'eraser'

export type HandwrittenPoint = {
  x: number
  y: number
}

export type HandwrittenStroke = {
  tool: HandwrittenTool
  width: number
  points: HandwrittenPoint[]
}

export type HandwrittenNote = {
  id: string
  userId: string
  title: string
  strokes: HandwrittenStroke[]
  createdAt: string
  updatedAt: string
}

export const HANDWRITTEN_NOTE_TITLE = '手書きメモ'

export const PEN_WIDTHS = [
  { id: 'thin', label: '細', size: 0.006 },
  { id: 'medium', label: '中', size: 0.012 },
  { id: 'thick', label: '太', size: 0.02 },
  { id: 'bold', label: '極太', size: 0.032 },
] as const

export function handwrittenNoteStorageKey(userId: string) {
  return `lm-handwritten-notes:${userId}`
}
