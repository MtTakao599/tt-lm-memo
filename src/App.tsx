import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { MemoForm } from './components/MemoForm'
import { MemoList } from './components/MemoList'
import { MemoTabs } from './components/MemoTabs'
import { CURRENT_USER_NAME } from './constants'
import { dummyMemos } from './data/dummyMemos'
import type { Memo, MemoDraft, TabId } from './types/memo'
import { isSameLocalDay } from './utils/date'
import './App.css'

function filterMemos(memos: Memo[], tab: TabId): Memo[] {
  switch (tab) {
    case 'today':
      return memos.filter((memo) => isSameLocalDay(memo.createdAt))
    case 'handover':
      return memos.filter((memo) => memo.handover)
    case 'open':
      return memos.filter((memo) => memo.status === '未対応')
    case 'all':
      return memos
  }
}

function sortByNewest(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function App() {
  const [view, setView] = useState<'list' | 'new'>('list')
  const [tab, setTab] = useState<TabId>('today')
  const [memos, setMemos] = useState<Memo[]>(dummyMemos)

  const visibleMemos = useMemo(
    () => sortByNewest(filterMemos(memos, tab)),
    [memos, tab],
  )

  function handleCreate(draft: MemoDraft) {
    const memo: Memo = {
      ...draft,
      id: crypto.randomUUID(),
      author: CURRENT_USER_NAME,
      createdAt: new Date().toISOString(),
    }
    setMemos((current) => [memo, ...current])
    setTab('today')
    setView('list')
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
            <MemoList memos={visibleMemos} />
          </>
        ) : (
          <MemoForm
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
          />
        )}
      </main>
    </div>
  )
}

export default App
