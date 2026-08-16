import { useRef, useState } from 'react'
import type {
  MasterCategory,
  MasterItem,
  MasterSet,
  StatusMasterItem,
} from '../types/master'
import type { ParsedSharedSettings } from '../types/settingsShare'
import {
  addMasterItem,
  moveMasterItem,
  normalizeSortOrder,
  renameMasterItem,
  setMasterEnabled,
  setTreatAsDone,
  sortMasters,
} from '../utils/masters'
import {
  SettingsShareError,
  buildSharedSettingsJson,
  downloadSettingsJson,
  parseSharedSettingsJson,
} from '../utils/settingsShare'
import { AndroidMigrationPanel } from './AndroidMigrationPanel'
import { ConfirmDialog } from './ConfirmDialog'

const CATEGORIES: { id: MasterCategory; label: string }[] = [
  { id: 'building', label: '棟' },
  { id: 'floor', label: '階' },
  { id: 'location', label: '場所' },
  { id: 'category', label: '区分' },
  { id: 'status', label: '状態' },
]

type MasterAdminProps = {
  userId: string
  masters: MasterSet
  useBuilding: boolean
  useFloor: boolean
  settingsLoadWarning: boolean
  onChange: (masters: MasterSet) => void
  onImport: (settings: ParsedSharedSettings) => void
  onMemosImported: () => void
  onReset: () => void
  onBack: () => void
}

export function MasterAdmin({
  userId,
  masters,
  useBuilding,
  useFloor,
  settingsLoadWarning,
  onChange,
  onImport,
  onMemosImported,
  onReset,
  onBack,
}: MasterAdminProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<MasterCategory>('building')
  const [newName, setNewName] = useState('')
  const [newTreatAsDone, setNewTreatAsDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [shareError, setShareError] = useState('')
  const [pendingImport, setPendingImport] = useState<ParsedSharedSettings | null>(
    null,
  )
  const [resetOpen, setResetOpen] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)

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
      <button
        type="button"
        className="back-link"
        disabled={migrationBusy}
        onClick={onBack}
      >
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

      <section className="settings-share">
        <h2>設定を共有</h2>
        <p>
          棟・階・場所・区分・状態の設定だけをJSONで書き出したり、Android版「管理人メモ」の設定を読み込んだりできます。メモや写真は含まれません。
        </p>
        {settingsLoadWarning ? (
          <p className="form-error">
            保存されていた設定を読み込めなかったため、初期設定を使用しています
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={migrationBusy}
          onClick={() => {
            downloadSettingsJson(
              buildSharedSettingsJson(masters, { useBuilding, useFloor }),
            )
            setShareError('')
          }}
        >
          設定を書き出す
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={migrationBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          設定を読み込む
        </button>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) {
              return
            }
            void file
              .text()
              .then((text) => {
                setPendingImport(parseSharedSettingsJson(text))
                setShareError('')
              })
              .catch((caught: unknown) => {
                setPendingImport(null)
                setShareError(
                  caught instanceof SettingsShareError
                    ? caught.message
                    : '設定ファイルを読み込めませんでした。',
                )
              })
          }}
        />
        {shareError ? <p className="form-error">{shareError}</p> : null}
      </section>

      <AndroidMigrationPanel
        userId={userId}
        onBusyChange={setMigrationBusy}
        onImported={onMemosImported}
        onBackToList={onBack}
      />

      <section className="danger-zone">
        <p className="danger-zone-label">危険な操作</p>
        <button
          type="button"
          className="btn btn-danger-quiet"
          disabled={migrationBusy}
          onClick={() => setResetOpen(true)}
        >
          初期設定に戻す
        </button>
      </section>

      {pendingImport ? (
        <ConfirmDialog
          title="設定ファイルを読み込みます"
          description={`マンション：${pendingImport.mansionName}`}
          cancelLabel="キャンセル"
          confirmLabel="読み込む"
          confirmTone="primary"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => {
            onImport(pendingImport)
            setPendingImport(null)
            setShareError('')
          }}
        >
          <ul className="settings-import-counts">
            <li>棟：{pendingImport.counts.building}項目</li>
            <li>階：{pendingImport.counts.floor}項目</li>
            <li>場所：{pendingImport.counts.location}項目</li>
            <li>区分：{pendingImport.counts.category}項目</li>
            <li>状態：{pendingImport.counts.status}項目</li>
          </ul>
          <p>
            現在のマスタ設定は読み込んだ内容に置き換わります。メモの内容は変更されません。
          </p>
        </ConfirmDialog>
      ) : null}

      {resetOpen ? (
        <ConfirmDialog
          title="マスタ設定を初期状態に戻しますか？"
          description="メモの内容は削除されません。"
          cancelLabel="キャンセル"
          confirmLabel="初期設定に戻す"
          onCancel={() => setResetOpen(false)}
          onConfirm={() => {
            onReset()
            setResetOpen(false)
            setShareError('')
          }}
        />
      ) : null}
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
