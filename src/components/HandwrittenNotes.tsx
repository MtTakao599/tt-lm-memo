import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { HandwrittenNoteEditor } from './HandwrittenNoteEditor'
import { HandwrittenPreview } from './HandwrittenCanvas'
import {
  createHandwrittenNote,
  deleteHandwrittenNote,
  fetchHandwrittenNotes,
  migrateLocalHandwrittenNotes,
  updateHandwrittenNote,
} from '../services/handwrittenNoteService'
import {
  HANDWRITTEN_NOTE_TITLE,
  type HandwrittenNote,
} from '../types/handwrittenNote'
import { toUserMessage } from '../utils/appError'
import { formatMemoDate } from '../utils/date'
import {
  isHandwrittenNoteMigrated,
  localHandwrittenNoteRepository,
  markHandwrittenNoteMigrated,
} from '../utils/handwrittenNoteStorage'

type HandwrittenNotesProps = {
  userId: string
}

export function HandwrittenNotes({ userId }: HandwrittenNotesProps) {
  const [notes, setNotes] = useState<HandwrittenNote[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const savedPayloadRef = useRef(new Map<string, string>())

  const remember = useCallback((note: HandwrittenNote) => {
    savedPayloadRef.current.set(note.id, notePayload(note))
  }, [])

  const loadNotes = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      let remote = await fetchHandwrittenNotes(userId)
      const local = localHandwrittenNoteRepository.list(userId)
      if (
        remote.length === 0 &&
        local.length > 0 &&
        !isHandwrittenNoteMigrated(userId)
      ) {
        await migrateLocalHandwrittenNotes(userId, local)
        markHandwrittenNoteMigrated(userId)
        remote = await fetchHandwrittenNotes(userId)
      }
      savedPayloadRef.current = new Map(
        remote.map((note) => [note.id, notePayload(note)]),
      )
      setNotes(remote)
      setLoadState('ready')
    } catch (error) {
      setLoadError(
        toUserMessage(error, '手書きメモを取得できませんでした。更新してください。'),
      )
      setLoadState('error')
    }
  }, [userId])

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  const saveNote = useCallback(async (note: HandwrittenNote) => {
    const payload = notePayload(note)
    if (savedPayloadRef.current.get(note.id) === payload) {
      return
    }
    try {
      const saved = await updateHandwrittenNote(note)
      remember(saved)
      setNotes((current) =>
        sortByUpdated([
          saved,
          ...current.filter((item) => item.id !== saved.id),
        ]),
      )
      setSaveError(null)
    } catch (error) {
      setSaveError(toUserMessage(error, '保存できませんでした。通信環境を確認してください。'))
      throw error
    }
  }, [remember])

  async function createNote() {
    if (isCreating || loadState !== 'ready') {
      return
    }
    setIsCreating(true)
    setSaveError(null)
    try {
      const note = await createHandwrittenNote(userId)
      remember(note)
      setNotes((current) => sortByUpdated([note, ...current]))
      setEditingId(note.id)
    } catch (error) {
      setSaveError(toUserMessage(error, '手書きメモを作成できませんでした。'))
    } finally {
      setIsCreating(false)
    }
  }

  async function removeNote(id: string) {
    try {
      await deleteHandwrittenNote(userId, id)
      savedPayloadRef.current.delete(id)
      setNotes((current) => current.filter((item) => item.id !== id))
      setSaveError(null)
      if (editingId === id) {
        setEditingId(null)
      }
    } catch (error) {
      setSaveError(toUserMessage(error, '削除できませんでした。'))
    } finally {
      setDeleteId(null)
    }
  }

  const editing = notes.find((note) => note.id === editingId) ?? null

  if (editing) {
    return (
      <HandwrittenNoteEditor
        note={editing}
        saveError={saveError}
        onSave={saveNote}
        onBack={() => setEditingId(null)}
      />
    )
  }

  return (
    <section className="ink-list">
      <div className="list-actions">
        <button
          type="button"
          className="new-memo-btn"
          disabled={loadState !== 'ready' || isCreating}
          onClick={() => void createNote()}
        >
          {isCreating ? '作成中…' : '＋ 新規メモ'}
        </button>
      </div>
      <h1 className="page-heading">手書きメモ</h1>
      <p className="free-memo-note">個人用・Supabase保存</p>
      {loadState === 'loading' ? <p className="free-memo-status">読み込み中…</p> : null}
      {loadState === 'error' ? (
        <div className="memo-load-error">
          <p className="form-error">
            {loadError ?? '手書きメモを取得できませんでした。更新してください。'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => void loadNotes()}>
            更新
          </button>
        </div>
      ) : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}
      {loadState === 'ready' && notes.length === 0 ? (
        <p className="memo-empty">手書きメモはまだありません</p>
      ) : loadState === 'ready' ? (
        <ul className="ink-items">
          {notes.map((note) => (
            <li key={note.id} className="ink-item">
              <button
                type="button"
                className="ink-open"
                onClick={() => setEditingId(note.id)}
              >
                <HandwrittenPreview strokes={note.strokes} />
                <span className="ink-item-text">
                  <span className="ink-item-title">
                    {note.title.trim() || HANDWRITTEN_NOTE_TITLE}
                  </span>
                  <span className="ink-item-time">{formatMemoDate(note.updatedAt)}</span>
                </span>
              </button>
              <button
                type="button"
                className="ink-delete"
                onClick={() => setDeleteId(note.id)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {deleteId ? (
        <ConfirmDialog
          title="この手書きメモを削除しますか？"
          description="削除したメモは元に戻せません。"
          cancelLabel="キャンセル"
          confirmLabel="削除"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => removeNote(deleteId)}
        />
      ) : null}
    </section>
  )
}

function notePayload(note: HandwrittenNote) {
  return JSON.stringify({ title: note.title, strokes: note.strokes })
}

function sortByUpdated(notes: HandwrittenNote[]) {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
