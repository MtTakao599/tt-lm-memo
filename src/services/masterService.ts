import { MANSION_KEY } from '../constants'
import { supabase } from '../lib/supabase'
import type { MemoMasterItemRow } from '../types/database'
import type {
  MasterCategory,
  MasterItem,
  MasterSet,
  SiteMasterSettings,
} from '../types/master'
import { AppError, logError } from '../utils/appError'
import {
  masterSetToReplacePayload,
  rowsToMasterSet,
  uiCategoryToDbType,
} from '../utils/masterMapper'

export type LoadedMasters = SiteMasterSettings & {
  isEmpty: boolean
}

export async function fetchMasters(): Promise<LoadedMasters> {
  const { data, error } = await supabase
    .from('memo_master_items')
    .select(
      'id, mansion_key, type, name, sort_order, enabled, treat_as_done, created_at, updated_at',
    )
    .eq('mansion_key', MANSION_KEY)
    .order('sort_order', { ascending: true })

  if (error) {
    logError('fetchMasters', error)
    throw new AppError('マスタ設定を取得できませんでした。更新してください。')
  }

  const flags = await fetchSiteFlags()
  const rows = (data ?? []) as MemoMasterItemRow[]
  return {
    masters: rowsToMasterSet(rows),
    useBuilding: flags.useBuilding,
    useFloor: flags.useFloor,
    isEmpty: rows.length === 0,
  }
}

export async function createMasterItem(input: {
  category: MasterCategory
  name: string
  sortOrder: number
  enabled?: boolean
  treatAsDone?: boolean
}): Promise<void> {
  const { error } = await supabase.from('memo_master_items').insert({
    mansion_key: MANSION_KEY,
    type: uiCategoryToDbType(input.category),
    name: input.name,
    sort_order: input.sortOrder,
    enabled: input.enabled ?? true,
    treat_as_done: input.treatAsDone ?? false,
  })
  if (error) {
    logError('createMasterItem', error)
    if (error.code === '23505') {
      throw new AppError('同じ名前の項目が既にあります')
    }
    throw new AppError('マスタを保存できませんでした')
  }
}

export async function updateMasterItem(
  id: string,
  patch: {
    name?: string
    enabled?: boolean
    sortOrder?: number
    treatAsDone?: boolean
  },
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    payload.name = patch.name
  }
  if (patch.enabled !== undefined) {
    payload.enabled = patch.enabled
  }
  if (patch.sortOrder !== undefined) {
    payload.sort_order = patch.sortOrder
  }
  if (patch.treatAsDone !== undefined) {
    payload.treat_as_done = patch.treatAsDone
  }

  const { error } = await supabase
    .from('memo_master_items')
    .update(payload)
    .eq('id', id)
    .eq('mansion_key', MANSION_KEY)

  if (error) {
    logError('updateMasterItem', error)
    if (error.code === '23505') {
      throw new AppError('同じ名前の項目が既にあります')
    }
    throw new AppError('マスタを保存できませんでした')
  }
}

export async function updateMasterSortOrders(items: MasterItem[]): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('memo_master_items')
      .update({ sort_order: item.sortOrder })
      .eq('id', item.id)
      .eq('mansion_key', MANSION_KEY)
    if (error) {
      logError('updateMasterSortOrders', error)
      throw new AppError('並び順を保存できませんでした')
    }
  }
}

export async function replaceMasters(
  masters: MasterSet,
  flags: { useBuilding: boolean; useFloor: boolean },
): Promise<LoadedMasters> {
  const items = masterSetToReplacePayload(masters)
  const { error } = await supabase.rpc('replace_memo_master_items', {
    p_mansion_key: MANSION_KEY,
    p_items: items,
    p_use_building: flags.useBuilding,
    p_use_floor: flags.useFloor,
  })
  if (error) {
    logError('replaceMasters', error)
    throw new AppError('マスタを保存できませんでした')
  }
  return fetchMasters()
}

async function fetchSiteFlags(): Promise<{
  useBuilding: boolean
  useFloor: boolean
}> {
  const { data, error } = await supabase
    .from('memo_site_settings')
    .select('use_building, use_floor')
    .eq('mansion_key', MANSION_KEY)
    .maybeSingle()

  if (error) {
    logError('fetchSiteFlags', error)
    throw new AppError('マスタ設定を取得できませんでした。更新してください。')
  }
  return {
    useBuilding: data?.use_building ?? true,
    useFloor: data?.use_floor ?? true,
  }
}
