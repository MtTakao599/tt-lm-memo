import { useFreeMemo } from '../hooks/useFreeMemo'

type FreeMemoProps = {
  userId: string
}

function formatSavedTime(iso: string) {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function statusLabel(
  status: 'saving' | 'saved' | 'error',
  savedAt: string | null,
) {
  if (status === 'saving') {
    return '保存中…'
  }
  if (status === 'error') {
    return '保存できませんでした'
  }
  if (savedAt) {
    return `保存済み 最終保存 ${formatSavedTime(savedAt)}`
  }
  return '保存済み'
}

export function FreeMemo({ userId }: FreeMemoProps) {
  const { content, setContent, status, savedAt } = useFreeMemo(userId)

  return (
    <section className="free-memo">
      <h1 className="page-heading">自由メモ</h1>
      <p className="free-memo-note">
        この端末のブラウザに保存される個人メモです
      </p>
      <label className="field">
        <span className="visually-hidden">自由メモ本文</span>
        <textarea
          className="free-memo-input"
          value={content}
          rows={12}
          placeholder="自分用のメモを自由に入力できます"
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <p
        className={
          status === 'error' ? 'free-memo-status is-error' : 'free-memo-status'
        }
      >
        {statusLabel(status, savedAt)}
      </p>
    </section>
  )
}
