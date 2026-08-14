import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Memo, MemoDraft, MemoPhoto, Status } from '../types/memo'
import {
  BUILDINGS,
  CATEGORIES,
  FLOORS,
  LOCATIONS,
  STATUSES,
} from '../data/formOptions'
import { formatMemoDate } from '../utils/date'
import { revokePhotoUrl } from '../utils/photos'
import { MemoPhotoField } from './MemoPhotoField'

type MemoFormProps = {
  mode: 'create' | 'edit'
  memo?: Memo
  onSubmit: (values: MemoDraft) => void
  onCancel: () => void
}

type SelectFieldProps = {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}

function optionsWithCurrent(
  options: readonly string[],
  current: string,
): readonly string[] {
  if (!current || options.includes(current)) {
    return options
  }
  return [current, ...options]
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

export function MemoForm({ mode, memo, onSubmit, onCancel }: MemoFormProps) {
  const initialPhotosRef = useRef(memo?.photos ?? [])
  const initialPhotoIdsRef = useRef(
    new Set(initialPhotosRef.current.map((photo) => photo.id)),
  )
  const [building, setBuilding] = useState(memo?.building ?? '')
  const [floor, setFloor] = useState(memo?.floor ?? '')
  const [location, setLocation] = useState(memo?.location ?? '')
  const [category, setCategory] = useState(memo?.category ?? '')
  const [status, setStatus] = useState<Status | ''>(memo?.status ?? '未対応')
  const [body, setBody] = useState(memo?.body ?? '')
  const [handover, setHandover] = useState(memo?.handover ?? false)
  const [photos, setPhotos] = useState<MemoPhoto[]>(initialPhotosRef.current)
  const [error, setError] = useState('')
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

  return (
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
        options={optionsWithCurrent(BUILDINGS, building)}
        onChange={setBuilding}
      />
      <SelectField
        label="階"
        value={floor}
        options={optionsWithCurrent(FLOORS, floor)}
        onChange={setFloor}
      />
      <SelectField
        label="場所"
        value={location}
        options={optionsWithCurrent(LOCATIONS, location)}
        onChange={setLocation}
      />
      <SelectField
        label="区分"
        value={category}
        options={optionsWithCurrent(CATEGORIES, category)}
        onChange={setCategory}
      />
      <SelectField
        label="状態"
        value={status}
        options={STATUSES}
        onChange={(value) => setStatus(value as Status | '')}
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
    </form>
  )
}
