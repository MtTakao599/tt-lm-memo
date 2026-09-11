import { useFreeMemo } from '../hooks/useFreeMemo'

type FreeMemoProps = {
  userId: string
  reloadToken?: number
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

export function FreeMemo({ userId, reloadToken = 0 }: FreeMemoProps) {
  const {
    content,
    setContent,
    status,
    savedAt,
    loadState,
    loadError,
    canMigrate,
    isMigrating,
    migrateError,
    migrateFromLocal,
    reload,
  } = useFreeMemo(userId, reloadToken)

  const busy = loadState === 'loading' || isMigrating
  const editingDisabled = busy || loadState === 'error' || canMigrate

  return (
    <section className="free-memo">
      <h1 className="page-heading">自由メモ</h1>
      <p className="free-memo-note">個人用・Supabase保存</p>

      {loadState === 'loading' ? (
        <p className="free-memo-status">読み込み中…</p>
      ) : null}

      {loadState === 'error' ? (
        <div className="memo-load-error">
          <p className="form-error">
            {loadError ?? '自由メモを取得できませんでした。更新してください。'}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void reload()}
          >
            更新
          </button>
        </div>
      ) : null}

      {canMigrate ? (
        <section className="free-memo-migrate">
          <p>
            この端末に未移行の自由メモがあります。共通保存へ移すと、PCとスマホで同じ内容を見られます。自動では登録しません。
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void migrateFromLocal()}
          >
            {isMigrating
              ? '移行中…'
              : 'この端末の自由メモをSupabaseへ移行'}
          </button>
          {migrateError ? <p className="form-error">{migrateError}</p> : null}
        </section>
      ) : null}

      <label className="field">
        <span className="visually-hidden">自由メモ本文</span>
        <textarea
          className="free-memo-input"
          value={content}
          rows={12}
          placeholder="自分用のメモを自由に入力できます"
          disabled={editingDisabled}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      {loadState === 'ready' && !canMigrate ? (
        <p
          className={
            status === 'error' ? 'free-memo-status is-error' : 'free-memo-status'
          }
        >
          {statusLabel(status, savedAt)}
        </p>
      ) : null}
    </section>
  )
}
