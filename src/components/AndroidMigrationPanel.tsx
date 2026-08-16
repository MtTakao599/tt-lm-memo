import { useEffect, useRef, useState } from 'react'
import {
  diagnoseMigratedPhotos,
  type MigratedPhotoDiagnosis,
} from '../services/migrationPhotoDiagnose'
import {
  buildMigrationPreview,
  importAndroidMigration,
} from '../services/migrationImportService'
import type {
  MigrationPreview,
  MigrationProgress,
  MigrationResult,
  ParsedMigrationZip,
} from '../types/migration'
import { toUserMessage } from '../utils/appError'
import { parseMigrationZip } from '../utils/migrationZip'
import { ConfirmDialog } from './ConfirmDialog'

type AndroidMigrationPanelProps = {
  userId: string
  onBusyChange: (busy: boolean) => void
  onImported: () => void
  onBackToList: () => void
}

export function AndroidMigrationPanel({
  userId,
  onBusyChange,
  onImported,
  onBackToList,
}: AndroidMigrationPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importingRef = useRef(false)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsed, setParsed] = useState<ParsedMigrationZip | null>(null)
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [diagnosis, setDiagnosis] = useState<MigratedPhotoDiagnosis | null>(null)
  const [isDiagnosing, setIsDiagnosing] = useState(false)

  const busy = isParsing || isImporting

  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])

  useEffect(() => {
    if (!isImporting) {
      return
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isImporting])

  async function handleDiagnose() {
    setError('')
    setIsDiagnosing(true)
    try {
      setDiagnosis(await diagnoseMigratedPhotos())
    } catch (caught) {
      setError(toUserMessage(caught, '移行写真の状態を確認できませんでした'))
    } finally {
      setIsDiagnosing(false)
    }
  }

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    setPreview(null)
    setParsed(null)
    setIsParsing(true)
    try {
      const next = await parseMigrationZip(file)
      const nextPreview = await buildMigrationPreview(next)
      setParsed(next)
      setPreview(nextPreview)
    } catch (caught) {
      setError(toUserMessage(caught, '移行ZIPを読み込めませんでした'))
    } finally {
      setIsParsing(false)
    }
  }

  async function handleStart() {
    if (!parsed || !preview || importingRef.current) {
      return
    }
    importingRef.current = true
    setPreview(null)
    setIsImporting(true)
    setProgress({ current: 0, total: parsed.memos.length })
    try {
      const next = await importAndroidMigration(parsed, userId, setProgress)
      setResult(next)
      onImported()
    } catch (caught) {
      setError(toUserMessage(caught, 'データを移行できませんでした'))
    } finally {
      importingRef.current = false
      setIsImporting(false)
      setParsed(null)
    }
  }

  return (
    <section className="settings-share">
      <h2>Android版からデータ移行</h2>
      <p>管理人メモ Android版から書き出した移行ZIPを取り込みます。</p>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {isParsing ? 'ZIPを確認中…' : '移行ZIPを選択'}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy || isDiagnosing}
        onClick={() => void handleDiagnose()}
      >
        {isDiagnosing ? '確認中…' : '移行写真の状態を確認'}
      </button>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".zip,application/zip"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file || busy) {
            return
          }
          void handleFile(file)
        }}
      />
      {isImporting && progress ? (
        <p className="migration-progress" aria-live="polite">
          データを移行中… {progress.current} / {progress.total}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {diagnosis ? (
        <div className="migration-result">
          <h3>移行写真の状態</h3>
          <p>{diagnosis.summary}</p>
          <ul className="settings-import-counts">
            <li>移行メモ：{diagnosis.memoCount}件</li>
            <li>memo_photos：{diagnosis.photoRowCount}件</li>
            <li>Storageファイル：{diagnosis.storageFileCount}件</li>
            {diagnosis.storageListFailed > 0 ? (
              <li>Storage一覧失敗：{diagnosis.storageListFailed}件</li>
            ) : null}
          </ul>
          <p>詳細はブラウザの開発者ツール（Console）の [migration] を見てください。</p>
        </div>
      ) : null}
      {result ? <MigrationResultView result={result} onBackToList={onBackToList} /> : null}

      {preview ? (
        <ConfirmDialog
          title="Android版データ移行"
          description={previewDescription(preview)}
          cancelLabel="キャンセル"
          confirmLabel={previewConfirmLabel(preview)}
          confirmTone="primary"
          onCancel={() => {
            setPreview(null)
            setParsed(null)
          }}
          onConfirm={() => void handleStart()}
        >
          <ul className="settings-import-counts">
            <li>メモ：{preview.memoCount}件</li>
            <li>新規取り込み予定：{preview.newCount}件</li>
            <li>すでに取り込み済み：{preview.alreadyImported}件</li>
            <li>写真：{preview.photoCount}件</li>
            <li>補完予定：{preview.photoToAdd}件</li>
            <li>既存：{preview.photoAlreadyPresent}件</li>
            <li>欠落写真：{preview.missingPhotoCount}件</li>
          </ul>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

function MigrationResultView({
  result,
  onBackToList,
}: {
  result: MigrationResult
  onBackToList: () => void
}) {
  return (
    <div className="migration-result">
      <h3>移行が完了しました</h3>
      {result.allSkipped ? (
        <p>この移行データはすでに取り込み済みです</p>
      ) : null}
      {result.stoppedEarly ? (
        <p className="form-error">途中で移行を中止しました</p>
      ) : null}
      {result.photoFailed > 0 ? (
        <p className="form-error">
          写真{result.photoFailed}件を保存できませんでした
        </p>
      ) : null}
      <ul className="settings-import-counts">
        <li>メモ新規：{result.memoSuccess}件</li>
        <li>メモ既存：{result.memoExisting}件</li>
        <li>メモ失敗：{result.memoFailed}件</li>
        <li>写真追加：{result.photoSuccess}件</li>
        <li>写真既存：{result.photoExisting}件</li>
        <li>写真欠落：{result.photoMissing}件</li>
        <li>写真失敗：{result.photoFailed}件</li>
      </ul>
      <button type="button" className="btn btn-primary" onClick={onBackToList}>
        一覧へ戻る
      </button>
    </div>
  )
}

function previewDescription(preview: MigrationPreview): string {
  if (preview.newCount === 0 && preview.photoToAdd > 0) {
    return `マンション：${preview.mansionName}。メモは移行済みですが、写真${preview.photoToAdd}件を補完できます。`
  }
  if (preview.newCount === 0 && preview.photoToAdd === 0) {
    return `マンション：${preview.mansionName}。この移行データはすでに取り込み済みです。`
  }
  return `マンション：${preview.mansionName}`
}

function previewConfirmLabel(preview: MigrationPreview): string {
  if (preview.newCount === 0 && preview.photoToAdd > 0) {
    return '写真を補完'
  }
  if (preview.newCount === 0 && preview.photoToAdd === 0) {
    return '確認'
  }
  return '移行を開始'
}
