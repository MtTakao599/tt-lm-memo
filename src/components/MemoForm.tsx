import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Memo, MemoDraft, MemoPhoto } from '../types/memo'
import { formatMemoDate } from '../utils/date'
import { revokePhotoUrl } from '../utils/photos'
import { ConfirmDialog } from './ConfirmDialog'
import { MemoPhotoField } from './MemoPhotoField'

type FormOptions = {
  buildings: string[]
  floors: string[]
  locations: string[]
  categories: string[]
  statuses: string[]
}

type MemoFormProps = {
  mode: 'create' | 'edit'
  memo?: Memo
  options: FormOptions
  defaultStatus: string
  onSubmit: (values: MemoDraft) => void
  onCancel: () => void
  onDelete?: (formPhotos: MemoPhoto[]) => void
}

type SelectFieldProps = {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const id = `field-${label}`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">選択してください</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export function MemoForm({
  mode,
  memo,
  options,
  defaultStatus,
  onSubmit,
  onCancel,
  onDelete,
}: MemoFormProps) {
  const initialPhotosRef = useRef(memo?.photos ?? [])
  const initialPhotoIdsRef = useRef(
    new Set(initialPhotosRef.current.map((photo) => photo.id)),
  )
  const [building, setBuilding] = useState(memo?.building ?? '')
  const [floor, setFloor] = useState(memo?.floor ?? '')
  const [location, setLocation] = useState(memo?.location ?? '')
  const [category, setCategory] = useState(memo?.category ?? '')
  const [status, setStatus] = useState(memo?.status ?? defaultStatus)
  const [body, setBody] = useState(memo?.body ?? '')
  const [handover, setHandover] = useState(memo?.handover ?? false)
  const [photos, setPhotos] = useState<MemoPhoto[]>(initialPhotosRef.current)
  const [error, setError] = useState('')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const submittedRef = useRef(false)
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    const initialPhotoIds = initialPhotoIdsRef.current
    return () => {
      if (submittedRef.current) {
        return
      }
      for (const photo of photosRef.current) {
        if (!initialPhotoIds.has(photo.id)) {
          revokePhotoUrl(photo)
        }
      }
    }
  }, [])

  function handleRemovePhoto(photo: MemoPhoto) {
    if (!initialPhotoIdsRef.current.has(photo.id)) {
      revokePhotoUrl(photo)
    }
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !building ||
      !floor ||
      !location ||
      !category ||
      !status ||
      !body.trim()
    ) {
      setError('未入力の項目があります')
      return
    }

    submittedRef.current = true
    const keptIds = new Set(photos.map((photo) => photo.id))
    for (const photo of initialPhotosRef.current) {
      if (!keptIds.has(photo.id)) {
        revokePhotoUrl(photo)
      }
    }

    onSubmit({
      building,
      floor,
      location,
      category,
      status,
      body: body.trim(),
      handover,
      photos,
    })
  }

  function handleConfirmDelete() {
    if (!onDelete) {
      return
    }
    submittedRef.current = true
    onDelete(photos)
  }

  return (
    <>
      <form className="memo-form" onSubmit={handleSubmit}>
        <h1 className="page-heading">
          {mode === 'edit' ? 'メモを編集' : '新規メモ'}
        </h1>

        {mode === 'edit' && memo ? (
          <div className="form-readonly">
            <p>
              <span>登録者</span>
              {memo.author}
            </p>
            <p>
              <span>登録日時</span>
              {formatMemoDate(memo.createdAt)}
            </p>
          </div>
        ) : null}

        <SelectField
          label="棟"
          value={building}
          options={options.buildings}
          onChange={setBuilding}
        />
        <SelectField
          label="階"
          value={floor}
          options={options.floors}
          onChange={setFloor}
        />
        <SelectField
          label="場所"
          value={location}
          options={options.locations}
          onChange={setLocation}
        />
        <SelectField
          label="区分"
          value={category}
          options={options.categories}
          onChange={setCategory}
        />
        <SelectField
          label="状態"
          value={status}
          options={options.statuses}
          onChange={setStatus}
        />

        <div className="field">
          <label htmlFor="field-body">本文</label>
          <textarea
            id="field-body"
            value={body}
            required
            rows={5}
            placeholder="状況や対応内容を入力してください"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <label className="handover-check">
          <input
            type="checkbox"
            checked={handover}
            onChange={(event) => setHandover(event.target.checked)}
          />
          <span>引き継ぎする</span>
        </label>

        <MemoPhotoField
          photos={photos}
          onChange={setPhotos}
          onRemove={handleRemovePhoto}
        />

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {mode === 'edit' ? '保存' : '登録'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
        </div>

        {mode === 'edit' && onDelete ? (
          <div className="danger-zone">
            <p className="danger-zone-label">危険な操作</p>
            <button
              type="button"
              className="btn btn-danger-quiet"
              onClick={() => setIsConfirmingDelete(true)}
            >
              このメモを削除
            </button>
          </div>
        ) : null}
      </form>

      {isConfirmingDelete ? (
        <ConfirmDialog
          title="このメモを削除しますか？"
          description="削除すると元に戻せません。"
          cancelLabel="キャンセル"
          confirmLabel="削除する"
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </>
  )
}
