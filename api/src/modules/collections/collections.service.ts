import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { walkingRoute, type Point } from '../../lib/routing.js'
import { statusesThatCanReach } from '../occurrences/occurrence-status.js'
import { getOccurrence } from '../occurrences/occurrences.service.js'
import type { CompleteCollectionInput } from './collections.schemas.js'

// Regra do projeto: cada pessoa pode ter no máximo 3 coletas em andamento, para que
// ninguém "reserve" muitas ocorrências sem buscá-las
export const MAX_ACTIVE_COLLECTIONS = 3

const LIMIT_MESSAGE = `Você já tem ${MAX_ACTIVE_COLLECTIONS} coletas em andamento. Finalize uma antes de assumir outra.`

// Assumir uma ocorrência para coleta (RN04, RN05, RN09; CT07, CT08, CT09, CT12)
export async function claimOccurrence(occurrenceId: string, collectorId: string) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    select: { userId: true },
  })
  if (!occurrence) throw new AppError(404, 'Ocorrência não encontrada')
  if (occurrence.userId === collectorId) {
    throw new AppError(403, 'Você não pode assumir a própria ocorrência')
  }

  const claimed = await prisma.$transaction(async (tx) => {
    // Trava por coletor até o fim da transação: pedidos simultâneos da mesma pessoa
    // são contados um de cada vez, então o limite não é furado
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${collectorId}))`
    const active = await tx.collection.count({
      where: { collectorId, completedAt: null, cancelledAt: null },
    })
    if (active >= MAX_ACTIVE_COLLECTIONS) {
      throw new AppError(409, LIMIT_MESSAGE, [], 'ACTIVE_COLLECTIONS_LIMIT')
    }

    // Atualização condicional atômica: entre vários pedidos simultâneos, o banco
    // garante que só um encontra a ocorrência ainda AVAILABLE e a altera
    const { count } = await tx.occurrence.updateMany({
      where: { id: occurrenceId, status: { in: statusesThatCanReach('IN_COLLECTION') } },
      data: { status: 'IN_COLLECTION' },
    })
    if (count === 0) return false

    await tx.collection.create({ data: { occurrenceId, collectorId } })
    return true
  })

  if (!claimed) throw new AppError(409, 'Esta ocorrência não está mais disponível para coleta')
  return getOccurrence(occurrenceId)
}

// Finalizar a coleta (RN06, RN07; CT10, CT11)
export async function completeCollection(
  occurrenceId: string,
  userId: string,
  input: CompleteCollectionInput,
) {
  const completed = await prisma.$transaction(async (tx) => {
    const collection = await tx.collection.findFirst({
      where: { occurrenceId, completedAt: null, cancelledAt: null },
      select: { id: true, collectorId: true },
    })
    if (!collection) return false
    if (collection.collectorId !== userId) {
      throw new AppError(403, 'Somente quem assumiu a coleta pode finalizá-la')
    }

    const { count } = await tx.occurrence.updateMany({
      where: { id: occurrenceId, status: { in: statusesThatCanReach('COLLECTED') } },
      data: { status: 'COLLECTED' },
    })
    if (count === 0) return false

    await tx.collection.update({
      where: { id: collection.id },
      data: { ...input, completedAt: new Date() },
    })
    return true
  })

  if (!completed) {
    // Diferencia "não existe" de "não há coleta em andamento"
    await getOccurrence(occurrenceId)
    throw new AppError(409, 'Não há coleta em andamento para esta ocorrência')
  }
  return getOccurrence(occurrenceId)
}

// Caminho do coletor até o material (só para quem assumiu a coleta em andamento,
// para que a cota do serviço de rotas não seja usada por qualquer pessoa)
export async function routeToOccurrence(occurrenceId: string, userId: string, from: Point) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    select: {
      status: true,
      latitude: true,
      longitude: true,
      collections: {
        where: { completedAt: null, cancelledAt: null },
        select: { collectorId: true },
        take: 1,
      },
    },
  })
  if (!occurrence) throw new AppError(404, 'Ocorrência não encontrada')
  if (occurrence.status !== 'IN_COLLECTION') {
    throw new AppError(409, 'A rota só existe durante a coleta')
  }
  if (occurrence.collections[0]?.collectorId !== userId) {
    throw new AppError(403, 'Somente quem assumiu a coleta pode ver a rota')
  }
  return walkingRoute(from, { latitude: occurrence.latitude, longitude: occurrence.longitude })
}
