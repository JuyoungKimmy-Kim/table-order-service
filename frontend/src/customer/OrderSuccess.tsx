import { useEffect, useState } from 'react'
import { won } from '../lib/format'
import type { CreateOrderResponse } from '../types'

interface OrderSuccessProps {
  order: CreateOrderResponse
  onDone: () => void
}

const REDIRECT_SECONDS = 5

// US-C4: 주문 성공 → 주문번호 표시 후 약 5초 뒤 메뉴로 자동 리다이렉트.
export default function OrderSuccess({ order, onDone }: OrderSuccessProps) {
  const [remaining, setRemaining] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer)
          onDone()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white p-6"
      data-testid="order-success"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold">주문이 접수되었습니다</h2>
        <p className="mt-2 text-slate-500">주문번호</p>
        <p className="mb-4 text-3xl font-extrabold text-brand-600" data-testid="order-success-number">
          {order.order_number}
        </p>
        <p className="text-slate-600">결제 총액 {won(order.total_amount)}</p>
        <p className="mt-6 text-sm text-slate-400">{remaining}초 후 메뉴로 돌아갑니다…</p>
        <button className="btn-primary mt-4 w-full" onClick={onDone} data-testid="order-success-continue">
          메뉴로 돌아가기
        </button>
      </div>
    </div>
  )
}
