import { useState } from 'react'
import type { MemoPhoto } from '../types/memo'

type MemoPhotoViewerProps = {
  photos: MemoPhoto[]
}

export function MemoPhotoViewer({ photos }: MemoPhotoViewerProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = photos.find((photo) => photo.id === activeId) ?? null

  if (photos.length === 0) {
    return null
  }

  return (
    <div className="detail-section">
      <p className="detail-label">写真（{photos.length}枚）</p>
      <div className="photo-grid">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="photo-grid-item"
            onClick={() => setActiveId(photo.id)}
          >
            <img src={photo.url} alt={photo.name} />
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="写真プレビュー"
          onClick={() => setActiveId(null)}
        >
          <img
            src={active.url}
            alt={active.name}
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className="btn btn-secondary photo-lightbox-close"
            onClick={() => setActiveId(null)}
          >
            閉じる
          </button>
        </div>
      ) : null}
    </div>
  )
}
