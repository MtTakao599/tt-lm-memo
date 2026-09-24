import { supabase } from '../lib/supabase'
import type { HandwrittenNoteRow } from '../types/database'
import {
  HANDWRITTEN_NOTE_TITLE,
  type HandwrittenNote,
} from '../types/handwrittenNote'
import { AppError, logError } from '../utils/appError'
import { parseHandwrittenStrokes } from '../utils/handwrittenNoteStorage'

const FETCH_ERROR = '手書きメモを取得できませんでした。更新してください。'
const SAVE_ERROR = '保存できませんでした。通信環境を確認してください。'
const CREATE_ERROR = '手書きメモを作成できませんでした。'
const DELETE_ERROR = '削除できませんでした。'
const MIGRATE_ERROR = 'この端末の手書きメモを移行できませんでした。'

const NOTE_COLUMNS =
  'id, user_id, title, drawing_data, sort_order, created_at, updated_at'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function fetchHandwrittenNotes(
  userId: string,
): Promise<HandwrittenNote[]> {
  const { data, error } = await supabase
    .from('handwritten_notes')
    .select(NOTE_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    logError('fetchHandwrittenNotes', error)
    throw new AppError(FETCH_ERROR)
  }

  return (data ?? []).flatMap((row) => {
    const note = mapRow(row as HandwrittenNoteRow)
    return note ? [note] : []
  })
}

export async function createHandwrittenNote(
  userId: string,
): Promise<HandwrittenNote> {
  const { data, error } = await supabase
    .from('handwritten_notes')
    .insert({
      user_id: userId,
      title: HANDWRITTEN_NOTE_TITLE,
      drawing_data: [],
      sort_order: 0,
    })
    .select(NOTE_COLUMNS)
    .single()

  if (error || !data) {
    logError('createHandwrittenNote', error)
    throw new AppError(CREATE_ERROR)
  }

  const note = mapRow(data as HandwrittenNoteRow)
  if (!note) {
    throw new AppError(CREATE_ERROR)
  }
  return note
}

export async function updateHandwrittenNote(
  note: HandwrittenNote,
): Promise<HandwrittenNote> {
  const { data, error } = await supabase
    .from('handwritten_notes')
    .update({
      title: note.title,
      drawing_data: note.strokes,
    })
    .eq('id', note.id)
    .eq('user_id', note.userId)
    .select(NOTE_COLUMNS)
    .single()

  if (error || !data) {
    logError('updateHandwrittenNote', error)
    throw new AppError(SAVE_ERROR)
  }

  const saved = mapRow(data as HandwrittenNoteRow)
  if (!saved) {
    throw new AppError(SAVE_ERROR)
  }
  return saved
}

export async function deleteHandwrittenNote(
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('handwritten_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    logError('deleteHandwrittenNote', error)
    throw new AppError(DELETE_ERROR)
  }
}

export async function migrateLocalHandwrittenNotes(
  userId: string,
  notes: HandwrittenNote[],
): Promise<void> {
  for (const note of notes) {
    const id = UUID_PATTERN.test(note.id) ? note.id : undefined
    const { error } = await supabase.from('handwritten_notes').insert({
      ...(id ? { id } : {}),
      user_id: userId,
      title: note.title.trim() || HANDWRITTEN_NOTE_TITLE,
      drawing_data: note.strokes,
      sort_order: 0,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })

    if (error) {
      logError('migrateLocalHandwrittenNotes', error)
      throw new AppError(MIGRATE_ERROR)
    }
  }
}

function mapRow(row: HandwrittenNoteRow): HandwrittenNote | null {
  if (!row.id || row.user_id === undefined) {
    return null
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: typeof row.title === 'string' ? row.title : HANDWRITTEN_NOTE_TITLE,
    strokes: parseHandwrittenStrokes(row.drawing_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
