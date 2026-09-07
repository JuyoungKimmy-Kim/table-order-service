import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, Menu } from '../types'

const CART_KEY = 'to.cart'

interface CartState {
  items: CartItem[]
  totalAmount: number
  totalCount: number
  add: (menu: Menu) => void
  increment: (menuId: number) => void
  decrement: (menuId: number) => void
  remove: (menuId: number) => void
  clear: () => void
}

const CartContext = createContext<CartState | null>(null)

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  // 장바구니는 브라우저에 영속(US-C3): 새로고침 후 유지
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo<CartState>(() => {
    const add = (menu: Menu) =>
      setItems((prev) => {
        const found = prev.find((i) => i.menu_id === menu.id)
        if (found) {
          return prev.map((i) => (i.menu_id === menu.id ? { ...i, quantity: i.quantity + 1 } : i))
        }
        return [...prev, { menu_id: menu.id, name: menu.name, price: menu.price, quantity: 1 }]
      })

    const increment = (menuId: number) =>
      setItems((prev) =>
        prev.map((i) => (i.menu_id === menuId ? { ...i, quantity: i.quantity + 1 } : i)),
      )

    const decrement = (menuId: number) =>
      setItems((prev) =>
        prev
          .map((i) => (i.menu_id === menuId ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
      )

    const remove = (menuId: number) => setItems((prev) => prev.filter((i) => i.menu_id !== menuId))
    const clear = () => setItems([])

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

    return { items, totalAmount, totalCount, add, increment, decrement, remove, clear }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
