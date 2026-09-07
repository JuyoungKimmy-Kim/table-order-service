import { useCallback, useEffect, useRef, useState } from 'react'
import { api, streamAdmin } from '../api/client'
import type { RecentOrder, SseEvent, TableSummary } from '../types'

// US-A2: 초기 dashboard 스냅샷 로드 → SSE 구독으로 증분 갱신.
// 연결 끊김 시 client.streamAdmin 이 재연결하며, 재연결 시 스냅샷 재조회로 재동기화.
export function useDashboard() {
  const [tables, setTables] = useState<TableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [highlights, setHighlights] = useState<Set<number>>(new Set())
  // 패널이 상세를 다시 불러오도록 하는 신호 (table_id → 변경 카운터)
  const [tick, setTick] = useState(0)
  const wasConnected = useRef(false)

  const loadSnapshot = useCallback(async () => {
    try {
      const data = await api.getDashboard()
      setTables(data.sort((a, b) => Number(a.table_number) - Number(b.table_number)))
      setError('')
    } catch {
      setError('대시보드를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const highlight = useCallback((tableId: number) => {
    setHighlights((prev) => new Set(prev).add(tableId))
    setTimeout(() => {
      setHighlights((prev) => {
        const next = new Set(prev)
        next.delete(tableId)
        return next
      })
    }, 1900)
  }, [])

  const applyEvent = useCallback(
    (ev: SseEvent) => {
      setTick((t) => t + 1)
      setTables((prev) =>
        prev.map((tbl) => {
          if (ev.data.table_id !== tbl.table_id) return tbl
          switch (ev.type) {
            case 'order_created': {
              const preview: RecentOrder = {
                order_number: ev.data.order_number,
                created_at: ev.data.created_at,
                status: ev.data.status,
                total_amount: ev.data.total_amount,
                items_summary: ev.data.items_summary,
              }
              return {
                ...tbl,
                session_id: ev.data.session_id,
                table_total: ev.data.table_total,
                order_count: tbl.order_count + 1,
                recent_orders: [preview, ...tbl.recent_orders].slice(0, 5),
              }
            }
            case 'order_status_changed':
              return {
                ...tbl,
                recent_orders: tbl.recent_orders.map((o) =>
                  o.order_number === ev.data.order_number ? { ...o, status: ev.data.status } : o,
                ),
              }
            case 'order_deleted':
              return {
                ...tbl,
                table_total: ev.data.table_total,
                order_count: Math.max(0, tbl.order_count - 1),
              }
            case 'table_session_closed':
              return { ...tbl, session_id: null, table_total: 0, order_count: 0, recent_orders: [] }
            default:
              return tbl
          }
        }),
      )
      if (ev.type === 'order_created') highlight(ev.data.table_id)
    },
    [highlight],
  )

  useEffect(() => {
    loadSnapshot()
    const handle = streamAdmin(applyEvent, (isConnected) => {
      setConnected(isConnected)
      // 재연결 성공 시(직전에 끊겼다가 다시 연결) 스냅샷 재조회로 유실 이벤트 보정
      if (isConnected && wasConnected.current === false) {
        wasConnected.current = true
      } else if (!isConnected) {
        if (wasConnected.current) loadSnapshot()
        wasConnected.current = false
      }
    })
    return () => handle.close()
  }, [loadSnapshot, applyEvent])

  return { tables, loading, error, connected, highlights, tick, reload: loadSnapshot }
}
