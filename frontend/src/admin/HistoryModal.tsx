import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { api, ApiError } from '../api/client'
import { formatTime, won } from '../lib/format'
import type { OrderHistoryEntry } from '../types'

interface HistoryModalProps {
  tableId: number
  tableNumber: string
  onClose: () => void
}

// US-A6: 테이블별 과거(이용 완료) 주문 내역, 시간 역순, 날짜 필터.
export default function HistoryModal({ tableId, tableNumber, onClose }: HistoryModalProps) {
  const [entries, setEntries] = useState<OrderHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getHistory(tableId, dateFrom || undefined, dateTo || undefined)
      setEntries(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : '과거 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [tableId, dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Modal open onClose={onClose} title={`테이블 ${tableNumber} 과거 내역`} maxWidth="max-w-2xl" testId="history-modal">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="date_from">
            시작일
          </label>
          <input
            id="date_from"
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            data-testid="history-date-from"
          />
        </div>
        <div>
          <label className="label" htmlFor="date_to">
            종료일
          </label>
          <input
            id="date_to"
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            data-testid="history-date-to"
          />
        </div>
        <button className="btn-secondary" onClick={load} data-testid="history-filter">
          조회
        </button>
      </div>

      {loading ? (
        <Spinner label="불러오는 중…" />
      ) : error ? (
        <p className="py-6 text-center text-red-600">{error}</p>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-slate-400">과거 내역이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.history_id} className="card p-4" data-testid={`history-entry-${e.history_id}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{e.order_number}</span>
                <StatusBadge status={e.status} />
              </div>
              <ul className="mb-2 text-sm text-slate-600">
                {e.items.map((it, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {it.menu_name} <span className="text-slate-400">x{it.quantity}</span>
                    </span>
                    <span>{won(it.unit_price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-2 text-sm text-slate-500">
                <span>주문 {formatTime(e.ordered_at)}</span>
                <span>이용완료 {formatTime(e.session_closed_at)}</span>
                <span className="font-bold text-slate-800">{won(e.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
