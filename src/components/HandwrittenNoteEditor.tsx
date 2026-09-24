import { useEffect, useRef, useState } from 'react'
import {
  HANDWRITTEN_NOTE_TITLE,
  PEN_WIDTHS,
  type HandwrittenNote,
  type HandwrittenStroke,
  type HandwrittenTool,
} from '../types/handwrittenNote'
import { HandwrittenCanvas } from './HandwrittenCanvas'
import { ConfirmDialog } from './ConfirmDialog'

const SAVE_DELAY_MS = 400

type HandwrittenNoteEditorProps = {
  note: HandwrittenNote
  onSave: (note: HandwrittenNote) => Promise<void>
  onBack: () => void
  saveError: string | null
}

export function HandwrittenNoteEditor({
  note,
  onSave,
  onBack,
  saveError,
}: HandwrittenNoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [strokes, setStrokes] = useState(note.strokes)
  const [past, setPast] = useState<HandwrittenStroke[][]>([])
  const [future, setFuture] = useState<HandwrittenStroke[][]>([])
  const [tool, setTool] = useState<HandwrittenTool>('pen')
  const [width, setWidth] = useState<number>(PEN_WIDTHS[1].size)
  const [confirmClear, setConfirmClear] = useState(false)
  const [savedAt, setSavedAt] = useState(note.updatedAt)
  const [isSaving, setIsSaving] = useState(false)
  const latestRef = useRef({ title, strokes, note })

  useEffect(() => {
    latestRef.current = { title, strokes, note }
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
      const current = latestRef.current
      const nextTitle = current.title.trim() || HANDWRITTEN_NOTE_TITLE
      if (
        nextTitle === current.note.title &&
        JSON.stringify(current.strokes) === JSON.stringify(current.note.strokes)
      ) {
        return
      }
      const updatedAt = new Date().toISOString()
      setIsSaving(true)
      try {
        await onSave({
          ...current.note,
          title: nextTitle,
          strokes: current.strokes,
          updatedAt,
        })
        setSavedAt(updatedAt)
      } catch {
        // エラー表示は親が saveError に載せる
      } finally {
        setIsSaving(false)
      }
      })()
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [title, strokes, onSave, note])

  function commit(next: HandwrittenStroke[]) {
    setPast((items) => [...items, strokes])
    setFuture([])
    setStrokes(next)
  }

  function undo() {
    setPast((items) => {
      const previous = items[items.length - 1]
      if (!previous) {
        return items
      }
      setFuture((next) => [strokes, ...next])
      setStrokes(previous)
      return items.slice(0, -1)
    })
  }

  function handleBack() {
    const nextTitle = title.trim() || HANDWRITTEN_NOTE_TITLE
    if (
      nextTitle !== note.title ||
      JSON.stringify(strokes) !== JSON.stringify(note.strokes)
    ) {
      void onSave({
        ...note,
        title: nextTitle,
        strokes,
        updatedAt: new Date().toISOString(),
      })
    }
    onBack()
  }

  function redo() {
    setFuture((items) => {
      const next = items[0]
      if (!next) {
        return items
      }
      setPast((history) => [...history, strokes])
      setStrokes(next)
      return items.slice(1)
    })
  }

  return (
    <section className="ink-editor">
      <div className="ink-editor-bar">
        <button type="button" className="btn btn-secondary ink-back" onClick={handleBack}>
          一覧へ戻る
        </button>
        <label className="field ink-title">
          <span className="visually-hidden">タイトル</span>
          <input
            value={title}
            maxLength={80}
            aria-label="タイトル"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
      </div>

      <div className="ink-tools" role="toolbar" aria-label="描画ツール">
        <button
          type="button"
          className={tool === 'pen' ? 'ink-tool is-active' : 'ink-tool'}
          onClick={() => setTool('pen')}
        >
          ペン
        </button>
        <button
          type="button"
          className={tool === 'eraser' ? 'ink-tool is-active' : 'ink-tool'}
          onClick={() => setTool('eraser')}
        >
          消しゴム
        </button>
        {PEN_WIDTHS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={width === item.size ? 'ink-tool is-active' : 'ink-tool'}
            onClick={() => setWidth(item.size)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="ink-tool" disabled={past.length === 0} onClick={undo}>
          Undo
        </button>
        <button type="button" className="ink-tool" disabled={future.length === 0} onClick={redo}>
          Redo
        </button>
        <button
          type="button"
          className="ink-tool"
          disabled={strokes.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          全消去
        </button>
      </div>

      <p className={saveError ? 'free-memo-status is-error' : 'free-memo-status'}>
        {saveError
          ? '保存できませんでした'
          : isSaving
            ? '保存中…'
            : `保存済み ${formatSavedTime(savedAt)}`}
      </p>

      <div className="ink-stage">
        <HandwrittenCanvas
          strokes={strokes}
          tool={tool}
          width={width}
          onStroke={(stroke) => commit([...strokes, stroke])}
        />
      </div>

      {confirmClear ? (
        <ConfirmDialog
          title="描画をすべて消しますか？"
          description="このメモの線をすべて消します。Undoで戻せます。"
          cancelLabel="キャンセル"
          confirmLabel="全消去"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            commit([])
            setConfirmClear(false)
          }}
        />
      ) : null}
    </section>
  )
}

function formatSavedTime(iso: string) {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
