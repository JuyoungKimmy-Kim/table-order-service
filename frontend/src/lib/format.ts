import type { OrderStatus } from '../types'

// 금액: 정수(원), 천단위 콤마 (BR-8)
export function won(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// 시각: ISO8601 UTC → 로컬 표시
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 주문 상태 한글 라벨 (BR-3)
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '대기중',
  preparing: '준비중',
  completed: '완료',
}

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  preparing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

// 허용 상태 전이 (BR-3.2): 인접 단계 양방향
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing'],
  preparing: ['pending', 'completed'],
  completed: ['preparing'],
}
