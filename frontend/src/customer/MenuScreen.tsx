import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Category, Menu } from '../types'
import MenuCard from './MenuCard'
import Spinner from '../components/Spinner'

// US-C2: 카테고리별 메뉴 탐색. 앱 진입 시 기본 화면.
export default function MenuScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [activeCat, setActiveCat] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [cats, allMenus] = await Promise.all([api.getCategories(), api.getMenus()])
        if (!alive) return
        setCategories(cats)
        setMenus(allMenus)
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.detail : '메뉴를 불러오지 못했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const visible = useMemo(
    () => (activeCat === 'all' ? menus : menus.filter((m) => m.category_id === activeCat)),
    [menus, activeCat],
  )

  if (loading) return <Spinner label="메뉴 불러오는 중…" />
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>

  return (
    <div>
      {/* 카테고리 탭 */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-slate-50/90 px-4 py-3 backdrop-blur">
        <CatTab active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="전체" testId="cat-all" />
        {categories.map((c) => (
          <CatTab
            key={c.id}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
            label={c.name}
            testId={`cat-${c.id}`}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-slate-400">표시할 메뉴가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((m) => (
            <MenuCard key={m.id} menu={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function CatTab({
  active,
  onClick,
  label,
  testId,
}: {
  active: boolean
  onClick: () => void
  label: string
  testId: string
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`menu-tab-${testId}`}
      className={`touch-target whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )
}
