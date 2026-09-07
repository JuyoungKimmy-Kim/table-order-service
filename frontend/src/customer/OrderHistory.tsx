import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Order } from '../types'
import { formatTime, won } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'

// US-C5: 현재 세션의 주문 내역 조회 (주문 시각순). 이전/완료 세션 제외(서버가 필터).
export default function OrderHistory({ active }: { active: boolean }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const data = await api.getCurrentOrders()
        if (alive) setOrders(data)
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.detail : '주문 내역을 불러오지 못했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [active])

  if (loading) return <Spinner label="주문 내역 불러오는 중…" />
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>
  if (orders.length === 0)
    return <p className="py-16 text-center text-slate-400">아직 주문 내역이 없습니다.</p>

  return (
    <div className="flex flex-col gap-3 pb-4" data-testid="order-history">
      {orders.map((o) => (
        <div key={o.order_id} className="card p-4" data-testid={`history-order-${o.order_id}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">{o.order_number}</span>
            <StatusBadge status={o.status} />
          </div>
          <ul className="mb-2 text-sm text-slate-600">
            {o.items.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  {it.menu_name} <span className="text-slate-400">x{it.quantity}</span>
                </span>
                <span>{won(it.unit_price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-slate-400">{formatTime(o.created_at)}</span>
            <span className="font-bold">{won(o.total_amount)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
