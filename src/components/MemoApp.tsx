import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePdfExport } from '../hooks/usePdfExport'
import { fetchMasters } from '../services/masterService'
import {
  createMemo,
  deleteMemo,
  fetchMemos,
  hydrateMemoPhotos,
  updateMemo,
  updateMemoStatus,
} from '../services/memoService'
import { EMPTY_FILTERS, isFiltersActive, type MemoFilters } from '../types/filters'
import { emptyMasterSet, type MasterSet } from '../types/master'
import type { Memo, MemoDraft, MemoPhoto, TabId } from '../types/memo'
import { toUserMessage } from '../utils/appError'
import {
  filterMemos,
  filterMemosBySearch,
  mergeFilterChoices,
  sortByNewestCreated,
} from '../utils/filterMemos'
import {
  defaultStatusName,
  optionsWithCurrent,
} from '../utils/masters'
import { mergeLoadedMemo } from '../utils/memoMapper'
import { downloadPdf } from '../utils/pdf/downloadPdf'
import { revokePhotoUrl } from '../utils/photos'
import { saveSiteSettings } from '../utils/siteSettingsStorage'
import { FreeMemo } from './FreeMemo'
import { HandwrittenNotes } from './HandwrittenNotes'
import { Header } from './Header'
import { MasterAdmin } from './MasterAdmin'
import { MemoDetail } from './MemoDetail'
import { MemoForm } from './MemoForm'
import { MemoList } from './MemoList'
import { MemoSearch } from './MemoSearch'
import { MemoTabs } from './MemoTabs'

type View = 'list' | 'new' | 'detail' | 'edit' | 'admin'
type LoadState = 'loading' | 'ready' | 'error'
type MasterLoadState = 'loading' | 'ready' | 'empty' | 'error'

const MASTER_FETCH_ERROR =
  'マスタ設定を取得できませんでした。更新してください。'
const MEMO_FETCH_ERROR = 'メモを読み込めませんでした'

type MemoAppProps = {
  userId: string
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
}

export function MemoApp({
  userId,
  userEmail,
  onSignOut,
  isSigningOut,
}: MemoAppProps) {
  const [view, setView] = useState<View>('list')
  const [tab, setTab] = useState<TabId>('today')
  const [memos, setMemos] = useState<Memo[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [masters, setMasters] = useState<MasterSet>(emptyMasterSet)
  const [useBuilding, setUseBuilding] = useState(true)
  const [useFloor, setUseFloor] = useState(true)
  const [masterLoadState, setMasterLoadState] = useState<MasterLoadState>('loading')
  const [masterError, setMasterError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<MemoFilters>(EMPTY_FILTERS)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [freeMemoReloadToken, setFreeMemoReloadToken] = useState(0)
  const listPdf = usePdfExport()

  const applyMemos = useCallback((next: Memo[]) => {
    setMemos((current) => {
      const byId = new Map(current.map((memo) => [memo.id, memo]))
      return next.map((memo) => mergeLoadedMemo(memo, byId.get(memo.id)))
    })
  }, [])

  const loadMemos = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoadState('loading')
      }
      setLoadError(null)
      try {
        const rows = await fetchMemos()
        applyMemos(rows)
        setLoadState('ready')
        const withFirst = await hydrateMemoPhotos(rows, 'first')
        applyMemos(withFirst)
      } catch (error) {
        setLoadError(toUserMessage(error, 'メモを読み込めませんでした'))
        if (mode === 'initial') {
          setLoadState('error')
        }
      }
    },
    [applyMemos],
  )

  const applyMasterSettings = useCallback(
    (settings: {
      masters: MasterSet
      useBuilding: boolean
      useFloor: boolean
      isEmpty?: boolean
    }) => {
      setMasters(settings.masters)
      setUseBuilding(settings.useBuilding)
      setUseFloor(settings.useFloor)
      setMasterLoadState(settings.isEmpty ? 'empty' : 'ready')
      setMasterError(null)
      if (settings.isEmpty) {
        return
      }
      try {
        saveSiteSettings({
          masters: settings.masters,
          useBuilding: settings.useBuilding,
          useFloor: settings.useFloor,
        })
      } catch {
        // バックアップ保存に失敗しても画面は継続する
      }
    },
    [],
  )

  const loadMasters = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setMasterLoadState('loading')
      }
      setMasterError(null)
      try {
        const loaded = await fetchMasters()
        applyMasterSettings(loaded)
      } catch (error) {
        setMasterError(toUserMessage(error, MASTER_FETCH_ERROR))
        if (mode === 'initial') {
          setMasterLoadState('error')
        }
        throw error
      }
    },
    [applyMasterSettings],
  )

  const refreshAll = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true)
      } else {
        setMasterLoadState('loading')
        setLoadState('loading')
      }
      setMasterError(null)
      setLoadError(null)

      const [masterResult, memoResult] = await Promise.allSettled([
        fetchMasters(),
        fetchMemos(),
      ])

      try {
        if (
          masterResult.status === 'rejected' ||
          memoResult.status === 'rejected'
        ) {
          if (
            mode === 'initial' &&
            masterResult.status === 'fulfilled'
          ) {
            applyMasterSettings(masterResult.value)
          }
          const masterMessage =
            masterResult.status === 'rejected'
              ? toUserMessage(masterResult.reason, MASTER_FETCH_ERROR)
              : null
          const memoMessage =
            memoResult.status === 'rejected'
              ? toUserMessage(memoResult.reason, MEMO_FETCH_ERROR)
              : null
          if (masterMessage) {
            setMasterError(
              memoMessage
                ? `${masterMessage}\n${memoMessage}`
                : masterMessage,
            )
            setMasterLoadState('error')
          }
          if (memoMessage) {
            setLoadError(memoMessage)
            setLoadState('error')
          }
          return
        }

        applyMasterSettings(masterResult.value)
        applyMemos(memoResult.value)
        setLoadState('ready')
        try {
          const withFirst = await hydrateMemoPhotos(memoResult.value, 'first')
          applyMemos(withFirst)
        } catch {
          // 写真の後読み失敗は、成功したメモ／マスタの表示を取り消さない
        }
      } finally {
        setIsRefreshing(false)
      }
    },
    [applyMasterSettings, applyMemos],
  )

  useEffect(() => {
    void refreshAll('initial')
  }, [refreshAll])

  const tabMemos = useMemo(() => {
    if (masterLoadState !== 'ready') {
      return []
    }
    return filterMemos(memos, tab, masters.statuses)
  }, [masterLoadState, memos, tab, masters.statuses])

  const visibleMemos = useMemo(
    () => sortByNewestCreated(filterMemosBySearch(tabMemos, filters)),
    [tabMemos, filters],
  )

  const filterOptions = useMemo(
    () => ({
      buildings: mergeFilterChoices(
        masters.buildings,
        memos.map((memo) => memo.building),
      ),
      floors: mergeFilterChoices(
        masters.floors,
        memos.map((memo) => memo.floor),
      ),
      locations: mergeFilterChoices(
        masters.locations,
        memos.map((memo) => memo.location),
      ),
      categories: mergeFilterChoices(
        masters.categories,
        memos.map((memo) => memo.category),
      ),
      statuses: mergeFilterChoices(
        masters.statuses,
        memos.map((memo) => memo.status),
      ),
    }),
    [masters, memos],
  )

  const selectedMemo = memos.find((memo) => memo.id === selectedId) ?? null

  const createOptions = useMemo(
    () => ({
      buildings: optionsWithCurrent(masters.buildings, ''),
      floors: optionsWithCurrent(masters.floors, ''),
      locations: optionsWithCurrent(masters.locations, ''),
      categories: optionsWithCurrent(masters.categories, ''),
      statuses: optionsWithCurrent(masters.statuses, ''),
    }),
    [masters],
  )

  const editOptions = useMemo(() => {
    if (!selectedMemo) {
      return createOptions
    }
    return {
      buildings: optionsWithCurrent(masters.buildings, selectedMemo.building),
      floors: optionsWithCurrent(masters.floors, selectedMemo.floor),
      locations: optionsWithCurrent(masters.locations, selectedMemo.location),
      categories: optionsWithCurrent(masters.categories, selectedMemo.category),
      statuses: optionsWithCurrent(masters.statuses, selectedMemo.status),
    }
  }, [createOptions, masters, selectedMemo])

  function upsertMemo(next: Memo) {
    setMemos((current) => {
      const existing = current.find((memo) => memo.id === next.id)
      const merged = mergeLoadedMemo(next, existing)
      if (!existing) {
        return [merged, ...current]
      }
      return current.map((memo) => (memo.id === next.id ? merged : memo))
    })
  }

  async function handleCreate(draft: MemoDraft) {
    const result = await createMemo(draft, userId)
    upsertMemo(result.memo)
    setNotice(result.photoWarning)
    setTab('today')
    setView('list')
  }

  async function handleSaveEdit(draft: MemoDraft) {
    if (!selectedMemo) {
      return
    }
    const result = await updateMemo(
      selectedMemo.id,
      draft,
      selectedMemo.photos,
      userId,
    )
    upsertMemo(result.memo)
    setNotice(result.photoWarning)
    setView('detail')
  }

  async function handleOpen(id: string) {
    setSelectedId(id)
    setDetailError(null)
    setView('detail')
    const target = memos.find((memo) => memo.id === id)
    if (!target) {
      return
    }
    const [hydrated] = await hydrateMemoPhotos([target], 'all')
    upsertMemo(hydrated)
  }

  function handleBackToList() {
    setView('list')
    setDetailError(null)
  }

  async function handleDelete(formPhotos: MemoPhoto[]) {
    if (!selectedMemo) {
      return
    }
    await deleteMemo(selectedMemo)
    for (const photo of formPhotos) {
      if (!photo.storagePath) {
        revokePhotoUrl(photo)
      }
    }
    setMemos((current) => current.filter((memo) => memo.id !== selectedMemo.id))
    setSelectedId(null)
    setView('list')
  }

  async function handleStatusChange(status: string) {
    if (!selectedMemo || selectedMemo.status === status || isUpdating) {
      return
    }
    setIsUpdating(true)
    setDetailError(null)
    try {
      const updated = await updateMemoStatus(selectedMemo.id, status)
      upsertMemo(updated)
    } catch (error) {
      setDetailError(toUserMessage(error, '状態を更新できませんでした'))
    } finally {
      setIsUpdating(false)
    }
  }

  const filtersActive = isFiltersActive(filters)
  const emptyMessage =
    memos.length === 0 ? 'メモはまだありません' : '該当するメモはありません'

  return (
    <div className="app">
      <Header
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
        onOpenAdmin={view === 'admin' ? undefined : () => setView('admin')}
      />

      {view === 'admin' ? (
        <main className="main">
          <MasterAdmin
            userId={userId}
            masters={masters}
            useBuilding={useBuilding}
            useFloor={useFloor}
            canSeed={masterLoadState === 'empty'}
            syncLabel={
              masterLoadState === 'empty'
                ? '共通設定：未登録'
                : masterLoadState === 'ready'
                  ? '設定保存先：Supabase'
                  : masterLoadState === 'error'
                    ? '共通設定：取得できませんでした'
                    : '共通設定：読み込み中…'
            }
            onReload={async () => {
              await loadMasters('refresh')
            }}
            onApply={applyMasterSettings}
            onMemosImported={() => void loadMemos('refresh')}
            onBack={handleBackToList}
          />
        </main>
      ) : null}

      {view !== 'admin' ? (
        <main className="main">
          {view === 'list' ? (
            <>
              {tab === 'handwritten' ? null : tab === 'free' ? (
                <div className="list-actions">
                  <div className="list-toolbar">
                    <button
                      type="button"
                      className="btn btn-secondary refresh-btn"
                      onClick={() =>
                        setFreeMemoReloadToken((token) => token + 1)
                      }
                    >
                      更新
                    </button>
                  </div>
                </div>
              ) : (
                <div className="list-actions">
                  <button
                    type="button"
                    className="new-memo-btn"
                    disabled={masterLoadState !== 'ready'}
                    onClick={() => setView('new')}
                  >
                    ＋ 新規メモ
                  </button>
                  <div className="list-toolbar">
                    <button
                      type="button"
                      className="btn btn-secondary pdf-btn"
                      disabled={
                        listPdf.busy ||
                        loadState !== 'ready' ||
                        masterLoadState !== 'ready'
                      }
                      onClick={() =>
                        listPdf.run(async () => {
                          const hydrated = await hydrateMemoPhotos(
                            visibleMemos,
                            'all',
                          )
                          applyMemos(hydrated)
                          const { generateMemoListPdf } = await import(
                            '../utils/pdf/generateMemoListPdf'
                          )
                          const result = await generateMemoListPdf(
                            hydrated,
                            tab,
                            filtersActive,
                          )
                          downloadPdf(result.bytes, result.fileName)
                        })
                      }
                    >
                      {listPdf.busy ? 'PDFを作成中…' : 'PDF出力'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary refresh-btn"
                      disabled={
                        isRefreshing ||
                        loadState === 'loading' ||
                        masterLoadState === 'loading'
                      }
                      onClick={() => void refreshAll('refresh')}
                    >
                      {isRefreshing ? '更新中…' : '更新'}
                    </button>
                  </div>
                  {listPdf.error ? (
                    <p className="form-error">{listPdf.error}</p>
                  ) : null}
                  {notice ? <p className="form-error">{notice}</p> : null}
                </div>
              )}
              <MemoTabs value={tab} onChange={setTab} />
              {tab === 'free' ? (
                <FreeMemo userId={userId} reloadToken={freeMemoReloadToken} />
              ) : tab === 'handwritten' ? (
                <HandwrittenNotes userId={userId} />
              ) : masterLoadState === 'loading' ? (
                <p className="memo-empty">設定を読み込み中…</p>
              ) : masterLoadState === 'error' ? (
                <div className="memo-load-error">
                  <p className="form-error">
                    {masterError ?? MASTER_FETCH_ERROR}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void refreshAll('initial')}
                  >
                    再読み込み
                  </button>
                </div>
              ) : masterLoadState === 'empty' ? (
                <div className="memo-load-error">
                  <p className="form-error">
                    共通のマスタ設定がまだ登録されていません。管理画面からこの端末の設定を登録してください。
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setView('admin')}
                  >
                    管理画面を開く
                  </button>
                </div>
              ) : loadState === 'loading' ? (
                <p className="memo-empty">メモを読み込み中…</p>
              ) : loadState === 'error' ? (
                <div className="memo-load-error">
                  <p className="form-error">{loadError}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void refreshAll('initial')}
                  >
                    再読み込み
                  </button>
                </div>
              ) : (
                <>
                  <MemoSearch
                    filters={filters}
                    options={filterOptions}
                    resultCount={visibleMemos.length}
                    tabCount={tabMemos.length}
                    isOpen={isFilterOpen}
                    onToggle={() => setIsFilterOpen((open) => !open)}
                    onChange={setFilters}
                  />
                  <MemoList
                    memos={visibleMemos}
                    statuses={masters.statuses}
                    emptyMessage={emptyMessage}
                    onOpen={(id) => void handleOpen(id)}
                  />
                </>
              )}
            </>
          ) : null}

          {view === 'new' ? (
            <MemoForm
              mode="create"
              options={createOptions}
              defaultStatus={defaultStatusName(masters.statuses)}
              onSubmit={handleCreate}
              onCancel={() => setView('list')}
            />
          ) : null}

          {view === 'detail' && selectedMemo ? (
            <MemoDetail
              memo={selectedMemo}
              statuses={masters.statuses}
              isUpdating={isUpdating}
              error={detailError}
              onBack={handleBackToList}
              onEdit={() => setView('edit')}
              onStatusChange={(status) => void handleStatusChange(status)}
            />
          ) : null}

          {view === 'edit' && selectedMemo ? (
            <MemoForm
              mode="edit"
              memo={selectedMemo}
              options={editOptions}
              defaultStatus={selectedMemo.status}
              onSubmit={handleSaveEdit}
              onCancel={() => setView('detail')}
              onDelete={handleDelete}
            />
          ) : null}
        </main>
      ) : null}
    </div>
  )
}
