// Máquina de estados da ocorrência (Plano de Projeto, seção 9)
//
//   AVAILABLE ◄─► IN_COLLECTION ──► COLLECTED
//       │               │
//       └──► CANCELLED ◄┘
//
// IN_COLLECTION → AVAILABLE (decisão de 04/10/2026): o coletor desiste ou o dono libera
// uma coleta parada; a ocorrência volta ao mapa e a coleta fica no histórico como desfeita.

import type { OccurrenceStatus } from '../../generated/prisma/enums.js'

const transitions: Record<OccurrenceStatus, readonly OccurrenceStatus[]> = {
  AVAILABLE: ['IN_COLLECTION', 'CANCELLED'],
  IN_COLLECTION: ['COLLECTED', 'CANCELLED', 'AVAILABLE'],
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

// Coleta em andamento: ainda não foi concluída, cancelada nem desfeita
export const OPEN_COLLECTION = { completedAt: null, cancelledAt: null, releasedAt: null } as const
