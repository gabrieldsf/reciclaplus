// Máquina de estados da ocorrência (Plano de Projeto, seção 9)
//
//   AVAILABLE ──► IN_COLLECTION ──► COLLECTED
//       │               │
//       └──► CANCELLED ◄┘

import type { OccurrenceStatus } from '../../generated/prisma/enums.js'

const transitions: Record<OccurrenceStatus, readonly OccurrenceStatus[]> = {
  AVAILABLE: ['IN_COLLECTION', 'CANCELLED'],
  IN_COLLECTION: ['COLLECTED', 'CANCELLED'],
  COLLECTED: [],
  CANCELLED: [],
}

export function canTransition(from: OccurrenceStatus, to: OccurrenceStatus) {
  return transitions[from].includes(to)
}

// Estados a partir dos quais é possível chegar em `to` (útil em updates condicionais)
export function statusesThatCanReach(to: OccurrenceStatus) {
  return (Object.keys(transitions) as OccurrenceStatus[]).filter((from) => canTransition(from, to))
}
