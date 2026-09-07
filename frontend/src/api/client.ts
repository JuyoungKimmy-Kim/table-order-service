// F3 ApiClient — REST 호출 + SSE 구독 + 토큰 부착.
// shared-contract v1.0 을 소비한다. base=/api (Vite proxy 또는 리버스 프록시가 백엔드로 라우팅).
import { adminToken, tableSession } from '../lib/tokens'
import type {
  AdminLoginResponse,
  AdminTable,
  Category,
  CreateOrderResponse,
  Menu,
  Order,
  OrderHistoryEntry,
  OrderStatus,
  SseEvent,
  TableLoginResponse,
  TableSummary,
} from '../types'

const BASE = '/api'

export class ApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

// 401 발생 시 앱(AuthContext)에 통지하기 위한 훅
type UnauthorizedHandler = (scope: 'admin' | 'table') => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  onUnauthorized = fn
}

type Auth = 'admin' | 'table' | 'none'

function authHeader(auth: Auth): Record<string, string> {
  if (auth === 'admin') {
    const t = adminToken.get()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }
  if (auth === 'table') {
    const s = tableSession.get()
    return s ? { Authorization: `Bearer ${s.table_token}` } : {}
  }
  return {}
}

interface RequestOpts {
  method?: string
  auth?: Auth
  body?: unknown
  query?: Record<string, string | number | undefined>
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', auth = 'none', body, query } = opts
  let url = BASE + path
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = { ...authHeader(auth) }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    onUnauthorized?.(auth === 'admin' ? 'admin' : 'table')
    throw new ApiError(401, await extractDetail(res, '인증이 만료되었습니다.'))
  }
  if (!res.ok) {
    throw new ApiError(res.status, await extractDetail(res, '요청을 처리하지 못했습니다.'))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

async function extractDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json()
    if (data && typeof data.detail === 'string') return data.detail
  } catch {
    /* ignore */
  }
  return fallback
}

export const api = {
  // --- 인증 ---
  adminLogin: (store_code: string, username: string, password: string) =>
    request<AdminLoginResponse>('/admin/login', {
      method: 'POST',
      body: { store_code, username, password },
    }),
  tableLogin: (store_code: string, table_number: string, table_password: string) =>
    request<TableLoginResponse>('/table/login', {
      method: 'POST',
      body: { store_code, table_number, table_password },
    }),

  // --- 메뉴 (고객/관리자 공용) ---
  getCategories: (auth: Auth = 'table') => request<Category[]>('/menus/categories', { auth }),
  getMenus: (categoryId?: number, auth: Auth = 'table') =>
    request<Menu[]>('/menus', { auth, query: { category_id: categoryId } }),

  // --- 주문 (고객) ---
  createOrder: (items: { menu_id: number; quantity: number }[]) =>
    request<CreateOrderResponse>('/orders', { method: 'POST', auth: 'table', body: { items } }),
  getCurrentOrders: () => request<Order[]>('/orders/current', { auth: 'table' }),

  // --- 관리자: 대시보드 ---
  getDashboard: () => request<TableSummary[]>('/admin/dashboard', { auth: 'admin' }),

  // --- 관리자: 주문/세션 ---
  getTableOrders: (tableId: number) =>
    request<Order[]>(`/admin/tables/${tableId}/orders`, { auth: 'admin' }),
  updateOrderStatus: (orderId: number, status: OrderStatus) =>
    request<{ order_id: number; status: OrderStatus }>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      auth: 'admin',
      body: { status },
    }),
  deleteOrder: (orderId: number) =>
    request<{ order_id: number; table_id: number; table_total: number }>(
      `/admin/orders/${orderId}`,
      { method: 'DELETE', auth: 'admin' },
    ),
  closeTable: (tableId: number) =>
    request<{ table_id: number; moved_count: number }>(`/admin/tables/${tableId}/close`, {
      method: 'POST',
      auth: 'admin',
    }),
  getHistory: (tableId: number, dateFrom?: string, dateTo?: string) =>
    request<OrderHistoryEntry[]>(`/admin/tables/${tableId}/history`, {
      auth: 'admin',
      query: { date_from: dateFrom, date_to: dateTo },
    }),

  // --- 관리자: 테이블 설정 ---
  createTable: (table_number: string, table_password: string) =>
    request<AdminTable>('/admin/tables', {
      method: 'POST',
      auth: 'admin',
      body: { table_number, table_password },
    }),
  getTables: () => request<AdminTable[]>('/admin/tables', { auth: 'admin' }),

  // --- 관리자: 메뉴 관리 ---
  createMenu: (payload: Partial<Menu> & { category_id: number; name: string; price: number }) =>
    request<Menu>('/admin/menus', { method: 'POST', auth: 'admin', body: payload }),
  updateMenu: (menuId: number, payload: Partial<Menu>) =>
    request<Menu>(`/admin/menus/${menuId}`, { method: 'PUT', auth: 'admin', body: payload }),
  deleteMenu: (menuId: number) =>
    request<void>(`/admin/menus/${menuId}`, { method: 'DELETE', auth: 'admin' }),
  reorderMenus: (orders: { menu_id: number; display_order: number }[]) =>
    request<Menu[]>('/admin/menus/reorder', { method: 'PATCH', auth: 'admin', body: orders }),
}

// --- SSE 스트림 (관리자) ---
// EventSource는 커스텀 Authorization 헤더를 못 붙이므로 fetch + ReadableStream 으로 event-stream 파싱.
export interface SseHandle {
  close: () => void
}

export function streamAdmin(
  onEvent: (ev: SseEvent) => void,
  onStatus?: (connected: boolean) => void,
): SseHandle {
  const controller = new AbortController()
  let closed = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  async function connect() {
    if (closed) return
    const token = adminToken.get()
    if (!token) {
      onUnauthorized?.('admin')
      return
    }
    try {
      const res = await fetch(`${BASE}/admin/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (res.status === 401) {
        onUnauthorized?.('admin')
        return
      }
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)

      onStatus?.(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
        for (const frame of frames) parseFrame(frame, onEvent)
      }
    } catch {
      // 정상 종료(abort) 외 오류 → 재연결
    } finally {
      onStatus?.(false)
      if (!closed) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (closed) return
    retryTimer = setTimeout(connect, 2000)
  }

  connect()

  return {
    close: () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      controller.abort()
    },
  }
}

function parseFrame(frame: string, onEvent: (ev: SseEvent) => void) {
  let eventType = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue // keep-alive 코멘트 무시
    if (line.startsWith('event:')) eventType = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return
  try {
    const data = JSON.parse(dataLines.join('\n'))
    if (
      eventType === 'order_created' ||
      eventType === 'order_status_changed' ||
      eventType === 'order_deleted' ||
      eventType === 'table_session_closed'
    ) {
      onEvent({ type: eventType, data } as SseEvent)
    }
  } catch {
    /* 파싱 실패 프레임 무시 */
  }
}
