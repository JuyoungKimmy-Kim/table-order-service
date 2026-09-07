import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { CartProvider, useCart } from '../context/CartContext'
import TableSetup from './TableSetup'
import MenuScreen from './MenuScreen'
import OrderHistory from './OrderHistory'
import CartDrawer from './CartDrawer'
import OrderConfirm from './OrderConfirm'
import OrderSuccess from './OrderSuccess'
import type { CreateOrderResponse } from '../types'

// US-C1: 저장된 세션이 있으면 자동으로 주문 화면. 없으면 초기 설정 화면.
export default function CustomerApp() {
  const { session } = useAuth()
  if (!session) return <TableSetup />
  return (
    <CartProvider>
      <CustomerMain />
    </CartProvider>
  )
}

type View = 'menu' | 'history'

function CustomerMain() {
  const { session, tableLogout } = useAuth()
  const { totalCount, clear } = useCart()
  const [view, setView] = useState<View>('menu')
  const [cartOpen, setCartOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState<CreateOrderResponse | null>(null)

  const handleSuccess = (order: CreateOrderResponse) => {
    setConfirmOpen(false)
    setCartOpen(false)
    clear() // 주문 성공 시 장바구니 자동 비움
    setSuccessOrder(order)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-slate-50/95 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">{session?.store_name ?? '메뉴'}</h1>
          <p className="text-xs text-slate-500">테이블 {session?.table_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary relative"
            onClick={() => setCartOpen(true)}
            data-testid="open-cart"
          >
            🛒 장바구니
            {totalCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white"
                data-testid="cart-count"
              >
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 뷰 전환 탭 */}
      <nav className="mb-3 flex gap-2">
        <TabButton active={view === 'menu'} onClick={() => setView('menu')} label="메뉴" testId="view-menu" />
        <TabButton
          active={view === 'history'}
          onClick={() => setView('history')}
          label="주문 내역"
          testId="view-history"
        />
        <button
          className="ml-auto touch-target px-3 text-sm text-slate-400 hover:text-slate-600"
          onClick={tableLogout}
          data-testid="table-logout"
        >
          세션 종료
        </button>
      </nav>

      <main className="flex-1">
        {view === 'menu' ? <MenuScreen /> : <OrderHistory active={view === 'history'} />}
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => setConfirmOpen(true)} />
      <OrderConfirm open={confirmOpen} onClose={() => setConfirmOpen(false)} onSuccess={handleSuccess} />
      {successOrder && (
        <OrderSuccess
          order={successOrder}
          onDone={() => {
            setSuccessOrder(null)
            setView('menu')
          }}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  testId,
}: {
  active: boolean
  onClick: () => void
  label: string
  testId: string
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`touch-target rounded-lg px-4 py-2 text-sm font-medium ${
        active ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'
      }`}
    >
      {label}
    </button>
  )
}
