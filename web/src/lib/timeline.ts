import type { Occurrence } from './types'

export type TimelineEvent = {
  // Único na linha do tempo (a mesma ocorrência pode ser assumida mais de uma vez)
  id: string
  key: 'created' | 'claimed' | 'released' | 'collected' | 'cancelled'
  label: string
  at: string
}

// Linha do tempo de uma ocorrência, montada a partir das datas registradas.
// Canceladas e coletadas são estados finais, então `updatedAt` marca o desfecho.
export function buildTimeline(occurrence: Occurrence, viewerId?: string): TimelineEvent[] {
  const who = (user: { id: string; name: string }) => (user.id === viewerId ? 'você' : user.name)
  const { collection } = occurrence

  const events: TimelineEvent[] = [
    {
      id: 'created',
      key: 'created',
      label: `Registrada por ${who(occurrence.user)}`,
      at: occurrence.createdAt,
    },
  ]
  // Coletas desfeitas antes da atual (desistência ou liberação pelo dono)
  for (const released of occurrence.releasedCollections) {
    events.push(
      {
        id: `claimed-${released.id}`,
        key: 'claimed',
        label: `Coleta assumida por ${who(released.collector)}`,
        at: released.acceptedAt,
      },
      {
        id: `released-${released.id}`,
        key: 'released',
        label:
          released.releaseReason === 'GAVE_UP'
            ? `${capitalize(who(released.collector))} desistiu da coleta`
            : `Coleta liberada por ${who(occurrence.user)} (o coletor não apareceu)`,
        at: released.releasedAt,
      },
    )
  }
  if (collection) {
    events.push({
      id: `claimed-${collection.id}`,
      key: 'claimed',
      label: `Coleta assumida por ${who(collection.collector)}`,
      at: collection.acceptedAt,
    })
    if (collection.completedAt) {
      events.push({
        id: 'collected',
        key: 'collected',
        label: 'Material coletado',
        at: collection.completedAt,
      })
    }
  }
  if (occurrence.status === 'CANCELLED') {
    events.push({
      id: 'cancelled',
      key: 'cancelled',
      label: 'Ocorrência cancelada',
      at: collection?.cancelledAt ?? occurrence.updatedAt,
    })
  }
  return events
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
