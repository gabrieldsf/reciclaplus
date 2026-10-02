import { statusBadgeClasses, statusLabels } from '../../lib/format'
import type { OccurrenceStatus } from '../../lib/types'

export function StatusBadge({ status }: { status: OccurrenceStatus }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${statusBadgeClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
