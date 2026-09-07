import { useState } from 'react'
import Modal from '../components/Modal'
import { useCart } from '../context/CartContext'
import { api, ApiError } from '../api/client'
import { won } from '../lib/format'
import type { CreateOrderResponse } from '../types'

interface OrderConfirmProps {
  open: boolean
  onClose: () => void
  onSuccess: (order: CreateOrderResponse) => void
}

// US-C4: 주문 확정 전 최종 확인 → POST /orders. 실패 시 장바구니 유지.
export default function OrderConfirm({ open, onClose, onSuccess }: OrderConfirmProps) {
  const { items, totalAmount } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setError('')
    setSubmitting(true)
    try {
      const order = await api.createOrder(items.map((i) => ({ menu_id: i.menu_id, quantity: i.quantity })))
      onSuccess(order)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : '주문에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="주문 확인" testId="order-confirm">
      <ul className="mb-4 divide-y">
        {items.map((i) => (
          <li key={i.menu_id} className="flex items-center justify-between py-2">
            <span>
              {i.name} <span className="text-slate-400">x{i.quantity}</span>
            </span>
            <span className="text-slate-600">{won(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mb-4 flex items-center justify-between border-t pt-3 text-lg font-bold">
        <span>총액</span>
        <span data-testid="order-confirm-total">{won(totalAmount)}</span>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600" data-testid="order-confirm-error">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={submitting}>
          취소
        </button>
        <button
          className="btn-primary"
          onClick={confirm}
          disabled={submitting || items.length === 0}
          data-testid="order-confirm-submit"
        >
          {submitting ? '접수 중…' : '주문 확정'}
        </button>
      </div>
    </Modal>
  )
}
