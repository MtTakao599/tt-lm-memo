import { useState } from 'react'
import type {
  MasterCategory,
  MasterItem,
  MasterSet,
  StatusMasterItem,
} from '../types/master'
import {
  addMasterItem,
  moveMasterItem,
  normalizeSortOrder,
  renameMasterItem,
  setMasterEnabled,
  setTreatAsDone,
  sortMasters,
} from '../utils/masters'

const CATEGORIES: { id: MasterCategory; label: string }[] = [
  { id: 'building', label: '棟' },
  { id: 'floor', label: '階' },
  { id: 'location', label: '場所' },
  { id: 'category', label: '区分' },
  { id: 'status', label: '状態' },
]

type MasterAdminProps = {
  masters: MasterSet
  onChange: (masters: MasterSet) => void
  onBack: () => void
}

export function MasterAdmin({ masters, onChange, onBack }: MasterAdminProps) {
  const [category, setCategory] = useState<MasterCategory>('building')
  const [newName, setNewName] = useState('')
  const [newTreatAsDone, setNewTreatAsDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')

  const items = getItems(masters, category)

  function updateItems(next: MasterItem[] | StatusMasterItem[]) {
    onChange(setItems(masters, category, next))
  }

  function handleAdd() {
    const extra =
      category === 'status' ? { treatAsDone: newTreatAsDone } : {}
    const result = addMasterItem(items, newName, extra)
    if (result.error) {
      setError(result.error)
      return
    }
    updateItems(result.items)
    setNewName('')
    setNewTreatAsDone(false)
    setError('')
  }

  function handleRename(id: string) {
    const result = renameMasterItem(items, id, editingName)
    if (result.error) {
      setError(result.error)
      return
    }
    updateItems(result.items)
    setEditingId(null)
    setEditingName('')
    setError('')
  }

  return (
    <section className="master-admin">
      <button type="button" className="back-link" onClick={onBack}>
        ← LMメモへ戻る
      </button>
      <h1 className="page-heading">マスタ管理</h1>
      <p className="master-lead">東京テラスの選択肢を管理します</p>

      <div className="master-tabs" role="tablist" aria-label="マスタの種類">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className={category === item.id ? 'memo-tab is-active' : 'memo-tab'}
            onClick={() => {
              setCategory(item.id)
              setEditingId(null)
              setNewName('')
              setNewTreatAsDone(false)
              setError('')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="master-add">
        <label className="field">
          <span>項目名</span>
          <input
            type="text"
            value={newName}
            placeholder="新しい項目名"
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        {category === 'status' ? (
          <label className="master-check">
            <input
              type="checkbox"
              checked={newTreatAsDone}
              onChange={(event) => setNewTreatAsDone(event.target.checked)}
            />
            <span>完了扱い（未対応に表示しない）</span>
          </label>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          ＋ 項目追加
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <ul className="master-list">
        {sortMasters(items).map((item, index) => {
          const isStatus = isStatusItem(item)
          const isEditing = editingId === item.id
          return (
            <li
              key={item.id}
              className={item.enabled ? 'master-item' : 'master-item is-disabled'}
            >
              {isEditing ? (
                <div className="master-edit">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <div className="master-item-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleRename(item.id)}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(null)
                        setError('')
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="master-item-top">
                    <p className="master-item-name">{item.name}</p>
                    <span
                      className={
                        item.enabled ? 'master-badge is-on' : 'master-badge is-off'
                      }
                    >
                      {item.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <p className="master-item-meta">並び順 {item.sortOrder + 1}</p>
                  {isStatus ? (
                    <label className="master-check">
                      <input
                        type="checkbox"
                        checked={item.treatAsDone}
                        onChange={(event) =>
                          updateItems(
                            setTreatAsDone(
                              items as StatusMasterItem[],
                              item.id,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                      <span>完了扱い（未対応に表示しない）</span>
                    </label>
                  ) : null}
                  <div className="master-item-actions">
                    <button
                      type="button"
                      className="master-icon-btn"
                      disabled={index === 0}
                      onClick={() =>
                        updateItems(moveMasterItem(items, item.id, -1))
                      }
                    >
                      ↑ 上へ
                    </button>
                    <button
                      type="button"
                      className="master-icon-btn"
                      disabled={index === items.length - 1}
                      onClick={() =>
                        updateItems(moveMasterItem(items, item.id, 1))
                      }
                    >
                      ↓ 下へ
                    </button>
                    <button
                      type="button"
                      className="master-icon-btn"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditingName(item.name)
                        setError('')
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="master-icon-btn"
                      onClick={() =>
                        updateItems(
                          setMasterEnabled(items, item.id, !item.enabled),
                        )
                      }
                    >
                      {item.enabled ? '無効化' : '復帰'}
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function isStatusItem(item: MasterItem): item is StatusMasterItem {
  return 'treatAsDone' in item
}

function getItems(masters: MasterSet, category: MasterCategory) {
  switch (category) {
    case 'building':
      return masters.buildings
    case 'floor':
      return masters.floors
    case 'location':
      return masters.locations
    case 'category':
      return masters.categories
    case 'status':
      return masters.statuses
  }
}

function setItems(
  masters: MasterSet,
  category: MasterCategory,
  items: MasterItem[] | StatusMasterItem[],
): MasterSet {
  const normalized = normalizeSortOrder(items)
  switch (category) {
    case 'building':
      return { ...masters, buildings: normalized }
    case 'floor':
      return { ...masters, floors: normalized }
    case 'location':
      return { ...masters, locations: normalized }
    case 'category':
      return { ...masters, categories: normalized }
    case 'status':
      return { ...masters, statuses: normalized as StatusMasterItem[] }
  }
}
