import { useState, type FormEvent } from 'react'
import type { MemoDraft, Status } from '../types/memo'
import {
  BUILDINGS,
  CATEGORIES,
  FLOORS,
  LOCATIONS,
  STATUSES,
} from '../data/formOptions'

type MemoFormProps = {
  onSubmit: (values: MemoDraft) => void
  onCancel: () => void
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

export function MemoForm({ onSubmit, onCancel }: MemoFormProps) {
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<Status | ''>('未対応')
  const [body, setBody] = useState('')
  const [handover, setHandover] = useState(false)
  const [error, setError] = useState('')

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

    onSubmit({
      building,
      floor,
      location,
      category,
      status,
      body: body.trim(),
      handover,
    })
  }

  return (
    <form className="memo-form" onSubmit={handleSubmit}>
      <h1 className="page-heading">新規メモ</h1>

      <SelectField
        label="棟"
        value={building}
        options={BUILDINGS}
        onChange={setBuilding}
      />
      <SelectField
        label="階"
        value={floor}
        options={FLOORS}
        onChange={setFloor}
      />
      <SelectField
        label="場所"
        value={location}
        options={LOCATIONS}
        onChange={setLocation}
      />
      <SelectField
        label="区分"
        value={category}
        options={CATEGORIES}
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

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          登録
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  )
}
