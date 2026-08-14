import { useEffect, useRef } from 'react'
import { APP_NAME, PROPERTY_NAME } from '../constants'
import type { Memo, TabId } from '../types/memo'
import { getTabLabel } from '../data/tabs'
import { formatDateTime, formatMemoDate } from '../utils/date'

type MemoPrintViewProps = {
  memos: Memo[]
  tab: TabId
  onBack: () => void
}

export function MemoPrintView({ memos, tab, onBack }: MemoPrintViewProps) {
  const printedAt = formatDateTime(new Date().toISOString())
  const docRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = docRef.current
    if (!root) {
      return
    }

    let cancelled = false
    const images = Array.from(root.querySelectorAll('img'))

    Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve()
              return
            }
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(() => {
      if (!cancelled) {
        window.print()
      }
    })

    return () => {
      cancelled = true
    }
  }, [memos, tab])

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button type="button" className="back-link" onClick={onBack}>
          ← 一覧へ戻る
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          印刷 / PDFとして保存
        </button>
        <p className="print-help">
          印刷ダイアログで「PDFとして保存」または「Microsoft Print to PDF」を選ぶと、PDFファイルを保存できます。
        </p>
      </div>

      <article className="print-doc" ref={docRef}>
        <header className="print-doc-header">
          <h1>{APP_NAME}</h1>
          <p className="print-doc-property">{PROPERTY_NAME}</p>
          <dl className="print-doc-meta">
            <div>
              <dt>対象</dt>
              <dd>{getTabLabel(tab)}</dd>
            </div>
            <div>
              <dt>出力日時</dt>
              <dd>{printedAt}</dd>
            </div>
            <div>
              <dt>件数</dt>
              <dd>{memos.length}件</dd>
            </div>
          </dl>
        </header>

        {memos.length === 0 ? (
          <p className="print-empty">該当するメモはありません</p>
        ) : (
          memos.map((memo, index) => (
            <section key={memo.id} className="print-memo">
              <h2>メモ {index + 1}</h2>
              <dl>
                <div>
                  <dt>棟</dt>
                  <dd>{memo.building}</dd>
                </div>
                <div>
                  <dt>階</dt>
                  <dd>{memo.floor}</dd>
                </div>
                <div>
                  <dt>場所</dt>
                  <dd>{memo.location}</dd>
                </div>
                <div>
                  <dt>区分</dt>
                  <dd>{memo.category}</dd>
                </div>
                <div>
                  <dt>状態</dt>
                  <dd>{memo.status}</dd>
                </div>
                <div>
                  <dt>引き継ぎ</dt>
                  <dd>{memo.handover ? 'ON' : 'OFF'}</dd>
                </div>
                <div className="print-memo-body">
                  <dt>本文</dt>
                  <dd>{memo.body}</dd>
                </div>
                <div>
                  <dt>登録者</dt>
                  <dd>{memo.author}</dd>
                </div>
                <div>
                  <dt>登録日時</dt>
                  <dd>{formatMemoDate(memo.createdAt)}</dd>
                </div>
                <div>
                  <dt>更新日時</dt>
                  <dd>{formatMemoDate(memo.updatedAt)}</dd>
                </div>
              </dl>
              {memo.photos.length > 0 ? (
                <div className="print-photos">
                  <p>写真（{memo.photos.length}枚）</p>
                  <div>
                    {memo.photos.map((photo) => (
                      <img key={photo.id} src={photo.url} alt={photo.name} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="print-no-photo">写真なし</p>
              )}
            </section>
          ))
        )}
      </article>
    </div>
  )
}
