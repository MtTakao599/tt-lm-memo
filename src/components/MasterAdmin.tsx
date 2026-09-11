import { useRef, useState } from 'react'
import { createInitialMasters } from '../data/initialMasters'
import {
  createMasterItem,
  replaceMasters,
  updateMasterItem,
  updateMasterSortOrders,
} from '../services/masterService'
import type {
  MasterCategory,
  MasterItem,
  MasterSet,
  StatusMasterItem,
} from '../types/master'
import type { ParsedSharedSettings } from '../types/settingsShare'
import { toUserMessage } from '../utils/appError'
import {
  addMasterItem,
  moveMasterItem,
  renameMasterItem,
  sortMasters,
} from '../utils/masters'
import {
  SettingsShareError,
  buildSharedSettingsJson,
  downloadSettingsJson,
  parseSharedSettingsJson,
} from '../utils/settingsShare'
import { readLocalSiteSettings } from '../utils/siteSettingsStorage'
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
  canSeed: boolean
  syncLabel: string
  onReload: () => Promise<void>
  onApply: (settings: {
    masters: MasterSet
    useBuilding: boolean
    useFloor: boolean
  }) => void
  onMemosImported: () => void
  onBack: () => void
}

export function MasterAdmin({
  userId,
  masters,
  useBuilding,
  useFloor,
  canSeed,
  syncLabel,
  onReload,
  onApply,
  onMemosImported,
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
  const [isSaving, setIsSaving] = useState(false)

  const items = getItems(masters, category)
  const busy = migrationBusy || isSaving

  async function runSave(action: () => Promise<void>, fallback: string) {
    if (isSaving) {
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await action()
      await onReload()
    } catch (caught) {
      setError(toUserMessage(caught, fallback))
    } finally {
      setIsSaving(false)
    }
  }

  function handleAdd() {
    const extra =
      category === 'status' ? { treatAsDone: newTreatAsDone } : {}
    const result = addMasterItem(items, newName, extra)
    if (result.error) {
      setError(result.error)
      return
    }
    const created = result.items[result.items.length - 1]
    if (!created) {
      return
    }
    void runSave(async () => {
      await createMasterItem({
        category,
        name: created.name,
        sortOrder: created.sortOrder,
        enabled: created.enabled,
        treatAsDone:
          'treatAsDone' in created
            ? Boolean((created as StatusMasterItem).treatAsDone)
            : false,
      })
      setNewName('')
      setNewTreatAsDone(false)
    }, 'マスタを保存できませんでした')
  }

  function handleRename(id: string) {
    const result = renameMasterItem(items, id, editingName)
    if (result.error) {
      setError(result.error)
      return
    }
    void runSave(async () => {
      await updateMasterItem(id, { name: editingName.trim() })
      setEditingId(null)
      setEditingName('')
    }, 'マスタを保存できませんでした')
  }

  async function handleConfirmImport() {
    if (!pendingImport || isSaving) {
      return
    }
    setIsSaving(true)
    setShareError('')
    try {
      const next = await replaceMasters(pendingImport.masters, {
        useBuilding: pendingImport.useBuilding,
        useFloor: pendingImport.useFloor,
      })
      onApply(next)
      setPendingImport(null)
    } catch (caught) {
      setShareError(toUserMessage(caught, '設定を読み込めませんでした'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    if (isSaving) {
      return
    }
    setIsSaving(true)
    setShareError('')
    try {
      const next = await replaceMasters(createInitialMasters(), {
        useBuilding: true,
        useFloor: true,
      })
      onApply(next)
      setResetOpen(false)
    } catch (caught) {
      setShareError(toUserMessage(caught, '初期設定に戻せませんでした'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSeed() {
    if (isSaving) {
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const local = readLocalSiteSettings()
      if (!local) {
        setError('この端末に登録できる設定がありません')
        return
      }
      const next = await replaceMasters(local.masters, {
        useBuilding: local.useBuilding,
        useFloor: local.useFloor,
      })
      onApply(next)
    } catch (caught) {
      setError(toUserMessage(caught, 'マスタを登録できませんでした'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="master-admin">
      <button
        type="button"
        className="back-link"
        disabled={busy}
        onClick={onBack}
      >
        ← LMメモへ戻る
      </button>
      <h1 className="page-heading">マスタ管理</h1>
      <p className="master-lead">東京テラスの選択肢を管理します</p>
      <p className="master-sync-status">{syncLabel}</p>
      {isSaving ? <p className="master-lead">保存中…</p> : null}

      {canSeed ? (
        <section className="settings-share">
          <h2>この端末の設定をSupabaseへ登録</h2>
          <p>
            共通保存にマスタがまだありません。この端末の現在の設定を登録すると、PCとスマホで同じ選択肢になります。自動では登録しません。
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void handleSeed()}
          >
            この端末の設定をSupabaseへ登録
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </section>
      ) : null}

      <div className="master-tabs" role="tablist" aria-label="マスタの種類">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className={category === item.id ? 'memo-tab is-active' : 'memo-tab'}
            disabled={busy}
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
            disabled={busy}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        {category === 'status' ? (
          <label className="master-check">
            <input
              type="checkbox"
              checked={newTreatAsDone}
              disabled={busy}
              onChange={(event) => setNewTreatAsDone(event.target.checked)}
            />
            <span>完了扱い（未対応に表示しない）</span>
          </label>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={handleAdd}
        >
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
                    disabled={busy}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <div className="master-item-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => handleRename(item.id)}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
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
                        disabled={busy}
                        onChange={(event) =>
                          void runSave(
                            () =>
                              updateMasterItem(item.id, {
                                treatAsDone: event.target.checked,
                              }),
                            'マスタを保存できませんでした',
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
                      disabled={busy || index === 0}
                      onClick={() =>
                        void runSave(async () => {
                          await updateMasterSortOrders(
                            moveMasterItem(items, item.id, -1),
                          )
                        }, '並び順を保存できませんでした')
                      }
                    >
                      ↑ 上へ
                    </button>
                    <button
                      type="button"
                      className="master-icon-btn"
                      disabled={busy || index === items.length - 1}
                      onClick={() =>
                        void runSave(async () => {
                          await updateMasterSortOrders(
                            moveMasterItem(items, item.id, 1),
                          )
                        }, '並び順を保存できませんでした')
                      }
                    >
                      ↓ 下へ
                    </button>
                    <button
                      type="button"
                      className="master-icon-btn"
                      disabled={busy}
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
                      disabled={busy}
                      onClick={() =>
                        void runSave(
                          () =>
                            updateMasterItem(item.id, {
                              enabled: !item.enabled,
                            }),
                          'マスタを保存できませんでした',
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
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || canSeed}
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
          disabled={busy}
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
          disabled={busy}
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
          confirmLabel={isSaving ? '保存中…' : '読み込む'}
          confirmTone="primary"
          onCancel={() => {
            if (!isSaving) {
              setPendingImport(null)
            }
          }}
          onConfirm={() => void handleConfirmImport()}
        >
          <ul className="settings-import-counts">
            <li>棟：{pendingImport.counts.building}項目</li>
            <li>階：{pendingImport.counts.floor}項目</li>
            <li>場所：{pendingImport.counts.location}項目</li>
            <li>区分：{pendingImport.counts.category}項目</li>
            <li>状態：{pendingImport.counts.status}項目</li>
          </ul>
          <p>
            現在の共通マスタ設定は読み込んだ内容に置き換わります。メモの内容は変更されません。
          </p>
        </ConfirmDialog>
      ) : null}

      {resetOpen ? (
        <ConfirmDialog
          title="マスタ設定を初期状態に戻しますか？"
          description="メモの内容は削除されません。全端末の共通設定が初期状態になります。"
          cancelLabel="キャンセル"
          confirmLabel={isSaving ? '保存中…' : '初期設定に戻す'}
          onCancel={() => {
            if (!isSaving) {
              setResetOpen(false)
            }
          }}
          onConfirm={() => void handleReset()}
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
