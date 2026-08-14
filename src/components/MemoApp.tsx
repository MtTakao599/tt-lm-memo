import { useMemo, useState } from 'react'
import { Header } from './Header'
import { MemoDetail } from './MemoDetail'
import { MemoForm } from './MemoForm'
import { MemoList } from './MemoList'
import { MemoTabs } from './MemoTabs'
import { dummyMemos } from '../data/dummyMemos'
import type { Memo, MemoDraft, Status, TabId } from '../types/memo'
import { filterMemos, sortByNewestCreated } from '../utils/filterMemos'

type View = 'list' | 'new' | 'detail' | 'edit'

type MemoAppProps = {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
}

export function MemoApp({ userEmail, onSignOut, isSigningOut }: MemoAppProps) {
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
      <Header
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
      />
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
