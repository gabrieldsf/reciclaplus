import { formatDateTime } from '../../lib/format'
import { buildTimeline } from '../../lib/timeline'
import type { TimelineEvent } from '../../lib/timeline'
import type { Occurrence } from '../../lib/types'

const dotColors: Record<TimelineEvent['key'], string> = {
  created: 'bg-brand-500',
  claimed: 'bg-amber-500',
  released: 'bg-orange-400',
  collected: 'bg-blue-600',
  cancelled: 'bg-stone-500',
}

export function Timeline({ occurrence, viewerId }: { occurrence: Occurrence; viewerId?: string }) {
  const events = buildTimeline(occurrence, viewerId)

  return (
    <section aria-label="Histórico da ocorrência" className="border-t border-brand-100 pt-4">
      <h3 className="mb-3 text-sm text-brand-700">Histórico</h3>
      <ol className="flex flex-col">
        {events.map((event, index) => (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-3 left-[5px] h-full w-0.5 bg-brand-100"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative mt-1 size-3 shrink-0 rounded-full ${dotColors[event.key]}`}
            />
            <div className="text-sm">
              <p className="font-medium">{event.label}</p>
              <time dateTime={event.at} className="text-xs text-brand-700">
                {formatDateTime(event.at)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
