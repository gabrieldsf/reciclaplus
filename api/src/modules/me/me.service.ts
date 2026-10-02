import { prisma } from '../../lib/prisma.js'
import {
  occurrenceBaseSelect,
  occurrenceSelect,
  toOccurrenceResponse,
} from '../occurrences/occurrences.service.js'

const MAX_HISTORY_RESULTS = 200

// Ocorrências registradas pelo usuário, em qualquer status, das mais recentes às mais antigas
export async function listMyOccurrences(userId: string) {
  const occurrences = await prisma.occurrence.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_HISTORY_RESULTS,
    select: occurrenceSelect,
  })
  return occurrences.map(toOccurrenceResponse)
}

// Coletas assumidas pelo usuário (em andamento, concluídas ou canceladas pelo dono)
export async function listMyCollections(userId: string) {
  return prisma.collection.findMany({
    where: { collectorId: userId },
    orderBy: { acceptedAt: 'desc' },
    take: MAX_HISTORY_RESULTS,
    select: {
      id: true,
      acceptedAt: true,
      completedAt: true,
      cancelledAt: true,
      collectedQuantity: true,
      observation: true,
      occurrence: { select: occurrenceBaseSelect },
    },
  })
}
