import { useRef, useState } from 'react'
import type { MemoPhoto } from '../types/memo'
import { createResizedPhoto, MAX_PHOTOS } from '../utils/photos'

type MemoPhotoFieldProps = {
  photos: MemoPhoto[]
  onChange: (photos: MemoPhoto[]) => void
  onRemove: (photo: MemoPhoto) => void
}

export function MemoPhotoField({
  photos,
  onChange,
  onRemove,
}: MemoPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const remaining = MAX_PHOTOS - photos.length
  const canAdd = remaining > 0

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || remaining <= 0 || isProcessing) {
      return
    }

    const files = Array.from(fileList)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)

    if (files.length === 0) {
      setError('画像ファイルを選択してください。')
      return
    }

    setError('')
    setIsProcessing(true)

    try {
      const added: MemoPhoto[] = []
      for (const file of files) {
        added.push(await createResizedPhoto(file))
      }
      onChange([...photos, ...added].slice(0, MAX_PHOTOS))
    } catch {
      setError('写真の処理に失敗しました。別の画像を試してください。')
    } finally {
      setIsProcessing(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="photo-field">
      <p className="field-label">写真</p>
      <p className="photo-field-help">最大{MAX_PHOTOS}枚まで登録できます</p>

      {photos.length > 0 ? (
        <ul className="photo-edit-list">
          {photos.map((photo) => (
            <li key={photo.id} className="photo-edit-item">
              <img src={photo.url} alt={photo.name} />
              <button
                type="button"
                className="photo-delete-btn"
                onClick={() => onRemove(photo)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="photo-empty">写真はまだありません</p>
      )}

      {canAdd ? (
        <label className={isProcessing ? 'photo-add-btn is-disabled' : 'photo-add-btn'}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={isProcessing}
            onChange={(event) => handleFiles(event.target.files)}
          />
          {isProcessing ? '写真を処理しています…' : '写真を追加'}
        </label>
      ) : null}
      {photos.length >= MAX_PHOTOS ? (
        <p className="photo-status">写真は{MAX_PHOTOS}枚までです</p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
