import type { Occurrence } from './types'

export type TimelineEvent = {
  key: 'created' | 'claimed' | 'collected' | 'cancelled'
  label: string
  at: string
}

// Linha do tempo de uma ocorrência, montada a partir das datas registradas.
// Canceladas e coletadas são estados finais, então `updatedAt` marca o desfecho.
export function buildTimeline(occurrence: Occurrence, viewerId?: string): TimelineEvent[] {
  const who = (user: { id: string; name: string }) => (user.id === viewerId ? 'você' : user.name)
  const { collection } = occurrence

  const events: TimelineEvent[] = [
    { key: 'created', label: `Registrada por ${who(occurrence.user)}`, at: occurrence.createdAt },
  ]
  if (collection) {
    events.push({
      key: 'claimed',
      label: `Coleta assumida por ${who(collection.collector)}`,
      at: collection.acceptedAt,
    })
    if (collection.completedAt) {
      events.push({ key: 'collected', label: 'Material coletado', at: collection.completedAt })
    }
  }
  if (occurrence.status === 'CANCELLED') {
    events.push({
      key: 'cancelled',
      label: 'Ocorrência cancelada',
      at: collection?.cancelledAt ?? occurrence.updatedAt,
    })
  }
  return events
}
