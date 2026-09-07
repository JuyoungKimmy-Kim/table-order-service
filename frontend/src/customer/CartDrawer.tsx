import { useCart } from '../context/CartContext'
import { won } from '../lib/format'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

// US-C3: 장바구니 관리 — 수량 조정/삭제/비우기/총액 실시간 재계산.
export default function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { items, totalAmount, increment, decrement, remove, clear } = useCart()

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="cart-drawer"
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">장바구니</h2>
          <button className="touch-target rounded-lg px-2 text-slate-500" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-16 text-center text-slate-400">담긴 메뉴가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((i) => (
                <li key={i.menu_id} className="card flex items-center gap-3 p-3" data-testid={`cart-item-${i.menu_id}`}>
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-sm text-slate-500">{won(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary h-8 w-8 p-0 text-lg"
                      onClick={() => decrement(i.menu_id)}
                      data-testid={`cart-dec-${i.menu_id}`}
                      aria-label="수량 감소"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold" data-testid={`cart-qty-${i.menu_id}`}>
                      {i.quantity}
                    </span>
                    <button
                      className="btn-secondary h-8 w-8 p-0 text-lg"
                      onClick={() => increment(i.menu_id)}
                      data-testid={`cart-inc-${i.menu_id}`}
                      aria-label="수량 증가"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="touch-target px-2 text-slate-400 hover:text-red-500"
                    onClick={() => remove(i.menu_id)}
                    data-testid={`cart-remove-${i.menu_id}`}
                    aria-label="삭제"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t p-4">
          <div className="mb-3 flex items-center justify-between text-lg font-bold">
            <span>합계</span>
            <span data-testid="cart-total">{won(totalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={clear}
              disabled={items.length === 0}
              data-testid="cart-clear"
            >
              비우기
            </button>
            <button
              className="btn-primary flex-[2]"
              onClick={onCheckout}
              disabled={items.length === 0}
              data-testid="cart-checkout"
            >
              주문하기
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}
