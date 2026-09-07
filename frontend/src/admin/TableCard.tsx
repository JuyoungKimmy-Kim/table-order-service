import type { TableSummary } from '../types'
import { formatTime, won } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

interface TableCardProps {
  summary: TableSummary
  highlighted: boolean
  onClick: () => void
}

export default function TableCard({ summary, highlighted, onClick }: TableCardProps) {
  const active = summary.session_id != null && summary.order_count > 0
  return (
    <button
      onClick={onClick}
      data-testid={`table-card-${summary.table_id}`}
      className={`card flex flex-col p-4 text-left transition hover:shadow-md ${
        highlighted ? 'animate-flash-in ring-2 ring-green-400' : ''
      } ${active ? '' : 'opacity-70'}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-bold">테이블 {summary.table_number}</span>
        <span className="text-sm text-slate-500">주문 {summary.order_count}건</span>
      </div>

      <div className="mb-3 text-2xl font-extrabold text-brand-600" data-testid={`table-total-${summary.table_id}`}>
        {won(summary.table_total)}
      </div>

      {active ? (
        <ul className="flex flex-col gap-1.5">
          {summary.recent_orders.map((o, idx) => (
            <li key={`${o.order_number}-${idx}`} className="rounded-md bg-slate-50 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.order_number}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-slate-500">
                <span className="truncate">{o.items_summary}</span>
                <span className="ml-2 shrink-0">{formatTime(o.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-slate-400">진행 중인 주문 없음</p>
      )}
    </button>
  )
}
