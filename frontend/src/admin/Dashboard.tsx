import { useMemo, useState } from 'react'
import { useDashboard } from './useDashboard'
import TableCard from './TableCard'
import TableOrdersPanel from './TableOrdersPanel'
import Spinner from '../components/Spinner'
import type { TableSummary } from '../types'

// US-A2: 테이블별 실시간 대시보드 (SSE). 필터 + 카드 클릭 상세.
export default function Dashboard() {
  const { tables, loading, error, connected, highlights, tick, reload } = useDashboard()
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const visible = useMemo(
    () => (filter === 'all' ? tables : tables.filter((t) => t.table_id === filter)),
    [tables, filter],
  )
  const selected: TableSummary | undefined = tables.find((t) => t.table_id === selectedId)

  if (loading) return <Spinner label="대시보드 불러오는 중…" />
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            connected ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
          }`}
          data-testid="sse-status"
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-400'}`} />
          {connected ? '실시간 연결됨' : '연결 대기…'}
        </span>

        {/* 테이블 필터 */}
        <select
          className="input ml-auto max-w-[180px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          data-testid="table-filter"
        >
          <option value="all">전체 테이블</option>
          {tables.map((t) => (
            <option key={t.table_id} value={t.table_id}>
              테이블 {t.table_number}
            </option>
          ))}
        </select>
      </div>

      {tables.length === 0 ? (
        <p className="py-16 text-center text-slate-400">
          등록된 테이블이 없습니다. "테이블 설정"에서 테이블을 추가하세요.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((t) => (
            <TableCard
              key={t.table_id}
              summary={t}
              highlighted={highlights.has(t.table_id)}
              onClick={() => setSelectedId(t.table_id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <TableOrdersPanel
          table={selected}
          tick={tick}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  )
}
