import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (m: string) => void
  error: (m: string) => void
  info: (m: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const STYLE: Record<ToastKind, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            data-testid={`toast-${t.kind}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${STYLE[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
