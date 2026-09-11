import { supabase } from '../lib/supabase'
import type { UserFreeMemoRow } from '../types/database'
import type { FreeMemoRecord } from '../types/freeMemo'
import { AppError, logError } from '../utils/appError'

const FETCH_ERROR = '自由メモを取得できませんでした。更新してください。'
const SAVE_ERROR = '保存できませんでした'

function mapRow(row: UserFreeMemoRow): FreeMemoRecord {
  return {
    userId: row.user_id,
    content: row.content,
    updatedAt: row.updated_at,
  }
}

export async function fetchFreeMemo(
  userId: string,
): Promise<FreeMemoRecord | null> {
  const { data, error } = await supabase
    .from('user_free_memos')
    .select('user_id, content, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    logError('fetchFreeMemo', error)
    throw new AppError(FETCH_ERROR)
  }
  if (!data) {
    return null
  }
  return mapRow(data as UserFreeMemoRow)
}

export async function upsertFreeMemo(
  userId: string,
  content: string,
): Promise<FreeMemoRecord> {
  const { data, error } = await supabase
    .from('user_free_memos')
    .upsert(
      {
        user_id: userId,
        content,
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, content, created_at, updated_at')
    .single()

  if (error || !data) {
    logError('upsertFreeMemo', error)
    throw new AppError(SAVE_ERROR)
  }
  return mapRow(data as UserFreeMemoRow)
}

export async function deleteFreeMemo(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_free_memos')
    .delete()
    .eq('user_id', userId)

  if (error) {
    logError('deleteFreeMemo', error)
    throw new AppError('自由メモを削除できませんでした')
  }
}
