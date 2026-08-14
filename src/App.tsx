import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { MemoDetail } from './components/MemoDetail'
import { MemoForm } from './components/MemoForm'
import { MemoList } from './components/MemoList'
import { MemoTabs } from './components/MemoTabs'
import { CURRENT_USER_NAME } from './constants'
import { dummyMemos } from './data/dummyMemos'
import type { Memo, MemoDraft, Status, TabId } from './types/memo'
import { filterMemos, sortByNewestCreated } from './utils/filterMemos'
import './App.css'

type View = 'list' | 'new' | 'detail' | 'edit'

function App() {
  const [view, setView] = useState<View>('list')
  const [tab, setTab] = useState<TabId>('today')
  const [memos, setMemos] = useState<Memo[]>(dummyMemos)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const visibleMemos = useMemo(
    () => sortByNewestCreated(filterMemos(memos, tab)),
    [memos, tab],
  )

  const selectedMemo = memos.find((memo) => memo.id === selectedId) ?? null

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
      author: CURRENT_USER_NAME,
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

  function handleStatusChange(status: Status) {
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
      <Header userName={CURRENT_USER_NAME} />
      <main className="main">
        {view === 'list' ? (
          <>
            <button
              type="button"
              className="new-memo-btn"
              onClick={() => setView('new')}
            >
              ＋ 新規メモ
            </button>
            <MemoTabs value={tab} onChange={setTab} />
            <MemoList memos={visibleMemos} onOpen={handleOpen} />
          </>
        ) : null}

        {view === 'new' ? (
          <MemoForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
          />
        ) : null}

        {view === 'detail' && selectedMemo ? (
          <MemoDetail
            memo={selectedMemo}
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
            onSubmit={handleSaveEdit}
            onCancel={() => setView('detail')}
          />
        ) : null}
      </main>
    </div>
  )
}

export default App
