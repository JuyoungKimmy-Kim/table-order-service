// shared-contract v1.0 응답 형태에 대응하는 프론트 타입.
// frontend는 아래 형태(REST/SSE 응답)에만 의존한다 (물리 DB 스키마 의존 금지).

export type OrderStatus = 'pending' | 'preparing' | 'completed'

export interface Category {
  id: number
  name: string
  display_order: number
}

export interface Menu {
  id: number
  category_id: number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  display_order: number
}

export interface OrderItem {
  menu_name: string
  unit_price: number
  quantity: number
}

export interface Order {
  order_id: number
  order_number: string
  status: OrderStatus
  total_amount: number
  created_at: string
  session_id?: number
  items: OrderItem[]
}

export interface CreateOrderResponse extends Order {
  session_id: number
}

export interface RecentOrder {
  order_number: string
  created_at: string
  status: OrderStatus
  total_amount: number
  items_summary: string
}

export interface TableSummary {
  table_id: number
  table_number: string
  session_id: number | null
  table_total: number
  order_count: number
  recent_orders: RecentOrder[]
}

export interface OrderHistoryEntry {
  history_id: number
  session_id: number
  order_number: string
  status: OrderStatus
  total_amount: number
  ordered_at: string
  session_closed_at: string
  items: OrderItem[]
}

export interface AdminTable {
  id: number
  table_number: string
}

// --- 인증 응답 ---
export interface AdminLoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface TableLoginResponse {
  table_token: string
  table_id: number
  table_number: string
  store_name: string
}

// --- SSE 이벤트 ---
export type SseEvent =
  | { type: 'order_created'; data: OrderCreatedEvent }
  | { type: 'order_status_changed'; data: OrderStatusChangedEvent }
  | { type: 'order_deleted'; data: OrderDeletedEvent }
  | { type: 'table_session_closed'; data: TableSessionClosedEvent }

export interface OrderCreatedEvent {
  table_id: number
  table_number: string
  session_id: number
  order_id: number
  order_number: string
  status: OrderStatus
  total_amount: number
  created_at: string
  table_total: number
  items_summary: string
}

export interface OrderStatusChangedEvent {
  table_id: number
  order_id: number
  order_number: string
  status: OrderStatus
}

export interface OrderDeletedEvent {
  table_id: number
  order_id: number
  table_total: number
}

export interface TableSessionClosedEvent {
  table_id: number
}

// --- 장바구니 (클라이언트 전용) ---
export interface CartItem {
  menu_id: number
  name: string
  price: number
  quantity: number
}
