import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import HistoryModal from './HistoryModal'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/Toast'
import { formatTime, NEXT_STATUSES, STATUS_LABEL, won } from '../lib/format'
import type { Order, OrderStatus, TableSummary } from '../types'

interface PanelProps {
  table: TableSummary
  tick: number // SSE 이벤트 발생 시 상세 재조회 트리거
  onClose: () => void
  onChanged: () => void // 대시보드 스냅샷 갱신 요청
}

// US-A3(상태변경) / US-A4(삭제) / US-A5(이용완료) / US-A6(과거내역 진입)
export default function TableOrdersPanel({ table, tick, onClose, onChanged }: PanelProps) {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getTableOrders(table.table_id)
      setOrders(data)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
    } finally {
      setLoading(false)
    }
  }, [table.table_id, toast])

  useEffect(() => {
    load()
  }, [load, tick])

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(order.order_id, status)
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, status } : o)))
      toast.success(`상태를 '${STATUS_LABEL[status]}'(으)로 변경했습니다.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '상태 변경에 실패했습니다.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteOrder(deleteTarget.order_id)
      setOrders((prev) => prev.filter((o) => o.order_id !== deleteTarget.order_id))
      toast.success('주문을 삭제했습니다.')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '주문 삭제에 실패했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const confirmClose = async () => {
    try {
      const res = await api.closeTable(table.table_id)
      toast.success(`이용 완료 처리했습니다. (${res.moved_count}건 이력 이동)`)
      onChanged()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.info('이미 정리된 테이블입니다.')
        onChanged()
        onClose()
      } else {
        toast.error(err instanceof ApiError ? err.detail : '이용 완료 처리에 실패했습니다.')
      }
    } finally {
      setCloseConfirm(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`테이블 ${table.table_number} 주문`} maxWidth="max-w-2xl" testId="table-orders-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-bold">현재 총액 {won(orders.reduce((s, o) => s + o.total_amount, 0))}</span>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setHistoryOpen(true)} data-testid="open-history">
            과거 내역
          </button>
          <button
            className="btn-danger"
            onClick={() => setCloseConfirm(true)}
            disabled={orders.length === 0}
            data-testid="close-session"
          >
            이용 완료
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="주문 불러오는 중…" />
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-slate-400">진행 중인 주문이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <div key={o.order_id} className="card p-4" data-testid={`admin-order-${o.order_id}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{o.order_number}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-xs text-slate-400">{formatTime(o.created_at)}</span>
                </div>
              </div>
              <ul className="mb-3 text-sm text-slate-600">
                {o.items.map((it, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {it.menu_name} <span className="text-slate-400">x{it.quantity}</span>
                    </span>
                    <span>{won(it.unit_price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-bold">{won(o.total_amount)}</span>
                <div className="flex items-center gap-2">
                  {NEXT_STATUSES[o.status].map((next) => (
                    <button
                      key={next}
                      className="btn-secondary px-3 py-1.5 text-sm"
                      onClick={() => changeStatus(o, next)}
                      data-testid={`status-to-${next}-${o.order_id}`}
                    >
                      {STATUS_LABEL[next]}(으)로
                    </button>
                  ))}
                  <button
                    className="btn-danger px-3 py-1.5 text-sm"
                    onClick={() => setDeleteTarget(o)}
                    data-testid={`delete-order-${o.order_id}`}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="주문 삭제"
        message={`주문 ${deleteTarget?.order_number}을(를) 삭제할까요? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={closeConfirm}
        title="이용 완료"
        message={`테이블 ${table.table_number}의 현재 주문을 이력으로 이동하고 세션을 종료할까요?`}
        confirmLabel="이용 완료"
        danger
        onConfirm={confirmClose}
        onCancel={() => setCloseConfirm(false)}
      />
      {historyOpen && (
        <HistoryModal tableId={table.table_id} tableNumber={table.table_number} onClose={() => setHistoryOpen(false)} />
      )}
    </Modal>
  )
}
