import {
  handwrittenNoteStorageKey,
  type HandwrittenNote,
  type HandwrittenStroke,
  type HandwrittenTool,
} from '../types/handwrittenNote'

export type HandwrittenNoteRepository = {
  list(userId: string): HandwrittenNote[]
  save(note: HandwrittenNote): void
  remove(userId: string, id: string): void
}

export function handwrittenNoteMigratedKey(userId: string) {
  return `lm-handwritten-notes-migrated:${userId}`
}

export function isHandwrittenNoteMigrated(userId: string) {
  try {
    return localStorage.getItem(handwrittenNoteMigratedKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markHandwrittenNoteMigrated(userId: string) {
  localStorage.setItem(handwrittenNoteMigratedKey(userId), '1')
}

export function parseHandwrittenStrokes(value: unknown): HandwrittenStroke[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((stroke) => {
    const parsed = parseStroke(stroke)
    return parsed ? [parsed] : []
  })
}

export function createHandwrittenNoteId(existingIds: Iterable<string> = []): string {
  const used = new Set(existingIds)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = createUniqueId()
    if (!used.has(id)) {
      return id
    }
  }
  return `${createUniqueId()}-${Date.now().toString(36)}`
}

function createUniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // HTTPのLANアクセスでは secure context がなく randomUUID が失敗する
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `ink-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export const localHandwrittenNoteRepository: HandwrittenNoteRepository = {
  list(userId) {
    return readNotes(userId)
  },
  save(note) {
    const notes = readNotes(note.userId).filter((item) => item.id !== note.id)
    notes.push(note)
    writeNotes(note.userId, notes)
  },
  remove(userId, id) {
    writeNotes(
      userId,
      readNotes(userId).filter((item) => item.id !== id),
    )
  },
}

function readNotes(userId: string): HandwrittenNote[] {
  try {
    const raw = localStorage.getItem(handwrittenNoteStorageKey(userId))
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.flatMap((item) => {
      const note = parseNote(item, userId)
      return note ? [note] : []
    })
  } catch {
    return []
  }
}

function writeNotes(userId: string, notes: HandwrittenNote[]) {
  localStorage.setItem(handwrittenNoteStorageKey(userId), JSON.stringify(notes))
}

function parseNote(value: unknown, userId: string): HandwrittenNote | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const record = value as Partial<HandwrittenNote>
  if (record.userId !== userId || typeof record.id !== 'string') {
    return null
  }
  if (typeof record.title !== 'string') {
    return null
  }
  if (typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string') {
    return null
  }
  if (!Array.isArray(record.strokes)) {
    return null
  }
  return {
    id: record.id,
    userId,
    title: record.title,
    strokes: parseHandwrittenStrokes(record.strokes),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function parseStroke(value: unknown): HandwrittenStroke | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const stroke = value as Partial<HandwrittenStroke>
  if (stroke.tool !== 'pen' && stroke.tool !== 'eraser') {
    return null
  }
  if (typeof stroke.width !== 'number' || !Number.isFinite(stroke.width)) {
    return null
  }
  if (!Array.isArray(stroke.points)) {
    return null
  }
  const points = stroke.points.flatMap((point) => {
    if (!point || typeof point !== 'object') {
      return []
    }
    const candidate = point as { x?: unknown; y?: unknown }
    if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number') {
      return []
    }
    return [{ x: candidate.x, y: candidate.y }]
  })
  return {
    tool: stroke.tool satisfies HandwrittenTool,
    width: stroke.width,
    points,
  }
}
