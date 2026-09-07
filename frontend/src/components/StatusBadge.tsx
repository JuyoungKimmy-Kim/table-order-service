import type { OrderStatus } from '../types'
import { STATUS_LABEL, STATUS_STYLE } from '../lib/format'

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
