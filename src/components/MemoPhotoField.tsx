import { useRef, useState } from 'react'
import { useMobilePhotoUi } from '../hooks/useMobilePhotoUi'
import type { MemoPhoto } from '../types/memo'
import { createResizedPhoto } from '../utils/photos'

type MemoPhotoFieldProps = {
  photos: MemoPhoto[]
  onChange: (photos: MemoPhoto[]) => void
  onRemove: (photo: MemoPhoto) => void
}

function isImageFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    file.type === '' ||
    /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)
  )
}

export function MemoPhotoField({
  photos,
  onChange,
  onRemove,
}: MemoPhotoFieldProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pickInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const isMobilePhotoUi = useMobilePhotoUi()

  function resetInputs() {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
    if (pickInputRef.current) {
      pickInputRef.current.value = ''
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || isProcessing) {
      return
    }

    const files = Array.from(fileList).filter(isImageFile)

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
      onChange([...photos, ...added])
    } catch {
      setError('写真の処理に失敗しました。別の画像を試してください。')
    } finally {
      setIsProcessing(false)
      resetInputs()
    }
  }

  const addClassName = isProcessing ? 'photo-add-btn is-disabled' : 'photo-add-btn'

  return (
    <div className="photo-field">
      <p className="field-label">写真</p>
      <p className="photo-field-help">
        {photos.length > 0
          ? `現在 ${photos.length}枚。何枚でも追加できます`
          : '何枚でも追加できます'}
      </p>

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

      {isMobilePhotoUi ? (
        <div className="photo-add-actions">
          <label className={addClassName}>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isProcessing}
              onChange={(event) => handleFiles(event.target.files)}
            />
            {isProcessing ? '写真を処理しています…' : 'カメラで撮影'}
          </label>
          <label className={addClassName}>
            <input
              ref={pickInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={isProcessing}
              onChange={(event) => handleFiles(event.target.files)}
            />
            {isProcessing ? '写真を処理しています…' : '写真を選択'}
          </label>
        </div>
      ) : (
        <label className={addClassName}>
          <input
            ref={pickInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={isProcessing}
            onChange={(event) => handleFiles(event.target.files)}
          />
          {isProcessing ? '写真を処理しています…' : '写真を追加'}
        </label>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
