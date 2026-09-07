import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import ConfirmDialog from '../components/ConfirmDialog'
import MenuForm from './MenuForm'
import type { MenuFormValues } from './MenuForm'
import { won } from '../lib/format'
import type { Category, Menu } from '../types'

// US-A7: 메뉴 등록/수정/삭제 + 노출 순서 조정.
export default function MenuManage() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null)

  const load = useCallback(async () => {
    try {
      const [cats, allMenus] = await Promise.all([
        api.getCategories('admin'),
        api.getMenus(undefined, 'admin'),
      ])
      setCategories(cats)
      setMenus(allMenus)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '메뉴를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: menus
        .filter((m) => m.category_id === c.id)
        .sort((a, b) => a.display_order - b.display_order),
    }))
  }, [categories, menus])

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (m: Menu) => {
    setEditing(m)
    setFormOpen(true)
  }

  const handleSubmit = async (values: MenuFormValues) => {
    try {
      if (editing) {
        const updated = await api.updateMenu(editing.id, values)
        setMenus((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        toast.success('메뉴를 수정했습니다.')
      } else {
        const created = await api.createMenu(values)
        setMenus((prev) => [...prev, created])
        toast.success('메뉴를 등록했습니다.')
      }
      setFormOpen(false)
    } catch (err) {
      // MenuForm 이 메시지를 표시하도록 rethrow
      throw new Error(err instanceof ApiError ? err.detail : '저장에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteMenu(deleteTarget.id)
      setMenus((prev) => prev.filter((m) => m.id !== deleteTarget.id))
      toast.success('메뉴를 삭제했습니다.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '삭제에 실패했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  // 노출 순서 조정: 같은 카테고리 내 인접 항목과 display_order 교환 후 reorder 반영.
  const move = async (categoryId: number, index: number, dir: -1 | 1) => {
    const items = menus
      .filter((m) => m.category_id === categoryId)
      .sort((a, b) => a.display_order - b.display_order)
    const target = items[index]
    const swap = items[index + dir]
    if (!target || !swap) return
    const payload = [
      { menu_id: target.id, display_order: swap.display_order },
      { menu_id: swap.id, display_order: target.display_order },
    ]
    try {
      await api.reorderMenus(payload)
      setMenus((prev) =>
        prev.map((m) => {
          if (m.id === target.id) return { ...m, display_order: swap.display_order }
          if (m.id === swap.id) return { ...m, display_order: target.display_order }
          return m
        }),
      )
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '순서 변경에 실패했습니다.')
    }
  }

  if (loading) return <Spinner label="메뉴 불러오는 중…" />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">메뉴 관리</h2>
        <button className="btn-primary" onClick={openCreate} data-testid="menu-create">
          + 메뉴 등록
        </button>
      </div>

      {grouped.map(({ category, items }) => (
        <section key={category.id} className="mb-6">
          <h3 className="mb-2 font-semibold text-slate-700">{category.name}</h3>
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">메뉴 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((m, idx) => (
                <div key={m.id} className="card flex items-center gap-3 p-3" data-testid={`manage-menu-${m.id}`}>
                  <div className="flex flex-col">
                    <button
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      onClick={() => move(category.id, idx, -1)}
                      disabled={idx === 0}
                      data-testid={`menu-up-${m.id}`}
                      aria-label="위로"
                    >
                      ▲
                    </button>
                    <button
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      onClick={() => move(category.id, idx, 1)}
                      disabled={idx === items.length - 1}
                      data-testid={`menu-down-${m.id}`}
                      aria-label="아래로"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{m.name}</p>
                    {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                  </div>
                  <span className="font-semibold text-brand-600">{won(m.price)}</span>
                  <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => openEdit(m)} data-testid={`menu-edit-${m.id}`}>
                    수정
                  </button>
                  <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => setDeleteTarget(m)} data-testid={`menu-delete-${m.id}`}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {formOpen && (
        <MenuForm categories={categories} initial={editing} onSubmit={handleSubmit} onClose={() => setFormOpen(false)} />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="메뉴 삭제"
        message={`'${deleteTarget?.name}' 메뉴를 삭제할까요?`}
        confirmLabel="삭제"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
