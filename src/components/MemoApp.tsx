import { useMemo, useState } from 'react'
import { createInitialMasters } from '../data/initialMasters'
import { dummyMemos } from '../data/dummyMemos'
import { usePdfExport } from '../hooks/usePdfExport'
import { EMPTY_FILTERS, isFiltersActive, type MemoFilters } from '../types/filters'
import type { MasterSet } from '../types/master'
import type { Memo, MemoDraft, MemoPhoto, TabId } from '../types/memo'
import { deleteMemoById } from '../utils/deleteMemo'
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
import { downloadPdf } from '../utils/pdf/downloadPdf'
import { FreeMemo } from './FreeMemo'
import { Header } from './Header'
import { MasterAdmin } from './MasterAdmin'
import { MemoDetail } from './MemoDetail'
import { MemoForm } from './MemoForm'
import { MemoList } from './MemoList'
import { MemoSearch } from './MemoSearch'
import { MemoTabs } from './MemoTabs'

type View = 'list' | 'new' | 'detail' | 'edit' | 'admin'

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
  const [memos, setMemos] = useState<Memo[]>(dummyMemos)
  const [masters, setMasters] = useState<MasterSet>(createInitialMasters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<MemoFilters>(EMPTY_FILTERS)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const listPdf = usePdfExport()

  const tabMemos = useMemo(
    () => filterMemos(memos, tab, masters.statuses),
    [memos, tab, masters.statuses],
  )

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

  function patchMemo(id: string, patch: Partial<Memo>) {
    const updatedAt = new Date().toISOString()
    setMemos((current) =>
      current.map((memo) =>
        memo.id === id ? { ...memo, ...patch, updatedAt } : memo,
      ),
    )
  }

  function handleCreate(draft: MemoDraft) {
    const now = new Date().toISOString()
    const memo: Memo = {
      ...draft,
      id: crypto.randomUUID(),
      author: userEmail,
      createdAt: now,
      updatedAt: now,
    }
    setMemos((current) => [memo, ...current])
    setTab('today')
    setView('list')
  }

  function handleSaveEdit(draft: MemoDraft) {
    if (!selectedId) {
      return
    }
    patchMemo(selectedId, draft)
    setView('detail')
  }

  function handleOpen(id: string) {
    setSelectedId(id)
    setView('detail')
  }

  function handleBackToList() {
    setView('list')
  }

  function handleDelete(formPhotos: MemoPhoto[]) {
    if (!selectedId) {
      return
    }
    setMemos((current) => deleteMemoById(current, selectedId, formPhotos))
    setSelectedId(null)
    setView('list')
  }

  function handleStatusChange(status: string) {
    if (!selectedMemo || selectedMemo.status === status) {
      return
    }
    patchMemo(selectedMemo.id, { status })
  }

  function handleHandoverChange(handover: boolean) {
    if (!selectedMemo || selectedMemo.handover === handover) {
      return
    }
    patchMemo(selectedMemo.id, { handover })
  }

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
            masters={masters}
            onChange={setMasters}
            onBack={handleBackToList}
          />
        </main>
      ) : null}

      {view !== 'admin' ? (
        <main className="main">
          {view === 'list' ? (
            <>
              {tab !== 'free' ? (
                <div className="list-actions">
                  <button
                    type="button"
                    className="new-memo-btn"
                    onClick={() => setView('new')}
                  >
                    ＋ 新規メモ
                  </button>
                  <div className="pdf-action">
                    <button
                      type="button"
                      className="btn btn-secondary pdf-btn"
                      disabled={listPdf.busy}
                      onClick={() =>
                        listPdf.run(async () => {
                          const { generateMemoListPdf } = await import(
                            '../utils/pdf/generateMemoListPdf'
                          )
                          const result = await generateMemoListPdf(
                            visibleMemos,
                            tab,
                            isFiltersActive(filters),
                          )
                          downloadPdf(result.bytes, result.fileName)
                        })
                      }
                    >
                      {listPdf.busy ? 'PDFを作成中…' : 'PDF出力'}
                    </button>
                    {listPdf.error ? (
                      <p className="form-error">{listPdf.error}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <MemoTabs value={tab} onChange={setTab} />
              {tab === 'free' ? (
                <FreeMemo userId={userId} />
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
                    onOpen={handleOpen}
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
              onBack={handleBackToList}
              onEdit={() => setView('edit')}
              onStatusChange={handleStatusChange}
              onHandoverChange={handleHandoverChange}
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
