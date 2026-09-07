import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
  testId?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  testId,
}: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid={testId}
    >
      <div
        className={`card w-full ${maxWidth} max-h-[85vh] overflow-y-auto p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              className="touch-target rounded-lg px-2 text-slate-500 hover:bg-slate-100"
              onClick={onClose}
              data-testid="modal-close"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
