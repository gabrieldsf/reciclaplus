import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { walkingRoute, type Point } from '../../lib/routing.js'
import { notify } from '../notifications/notifications.service.js'
import { OPEN_COLLECTION, statusesThatCanReach } from '../occurrences/occurrence-status.js'
import { getOccurrence } from '../occurrences/occurrences.service.js'
import { assertUsablePhoto } from '../photos/photos.service.js'
import type { CompleteCollectionInput } from './collections.schemas.js'

// Regra do projeto: cada pessoa pode ter no máximo 3 coletas em andamento, para que
// ninguém "reserve" muitas ocorrências sem buscá-las
export const MAX_ACTIVE_COLLECTIONS = 3

// Se o coletor some, o dono pode liberar a coleta depois deste tempo
export const RELEASE_AFTER_HOURS = 24

const NO_OPEN_COLLECTION = 'Não há coleta em andamento para esta ocorrência'

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
      where: { collectorId, ...OPEN_COLLECTION },
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
    await notify(tx, {
      userId: occurrence.userId,
      type: 'COLLECTION_CLAIMED',
      occurrenceId,
      actorId: collectorId,
    })
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
  // A foto (se enviada) precisa ser da própria pessoa e ainda não usada
  if (input.photoId) await assertUsablePhoto(input.photoId, userId)

  const completed = await prisma.$transaction(async (tx) => {
    const collection = await tx.collection.findFirst({
      where: { occurrenceId, ...OPEN_COLLECTION },
      select: { id: true, collectorId: true, occurrence: { select: { userId: true } } },
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
    await notify(tx, {
      userId: collection.occurrence.userId,
      type: 'COLLECTION_COMPLETED',
      occurrenceId,
      actorId: userId,
    })
    return true
  })

  if (!completed) {
    // Diferencia "não existe" de "não há coleta em andamento"
    await getOccurrence(occurrenceId)
    throw new AppError(409, NO_OPEN_COLLECTION)
  }
  return getOccurrence(occurrenceId)
}

// Desfaz a coleta em andamento: a ocorrência volta a ficar disponível no mapa e a coleta
// fica no histórico como desfeita. Quem pode fazer isso depende do motivo:
//   GAVE_UP           → o próprio coletor desiste
//   RELEASED_BY_OWNER → o dono libera, se a coleta está parada há RELEASE_AFTER_HOURS
async function releaseCollection(
  occurrenceId: string,
  userId: string,
  reason: 'GAVE_UP' | 'RELEASED_BY_OWNER',
) {
  const released = await prisma.$transaction(async (tx) => {
    const collection = await tx.collection.findFirst({
      where: { occurrenceId, ...OPEN_COLLECTION },
      select: {
        id: true,
        collectorId: true,
        acceptedAt: true,
        occurrence: { select: { userId: true } },
      },
    })
    if (!collection) return false
    const ownerId = collection.occurrence.userId

    if (reason === 'GAVE_UP' && collection.collectorId !== userId) {
      throw new AppError(403, 'Somente quem assumiu a coleta pode desistir dela')
    }
    if (reason === 'RELEASED_BY_OWNER') {
      if (ownerId !== userId) {
        throw new AppError(403, 'Somente quem registrou a ocorrência pode liberar a coleta')
      }
      const hours = (Date.now() - collection.acceptedAt.getTime()) / 3_600_000
      if (hours < RELEASE_AFTER_HOURS) {
        throw new AppError(
          409,
          `A coleta só pode ser liberada ${RELEASE_AFTER_HOURS} h depois de assumida`,
        )
      }
    }

    // Condicional: se a coleta foi finalizada ou cancelada ao mesmo tempo, só uma vence
    const { count } = await tx.occurrence.updateMany({
      where: { id: occurrenceId, status: { in: statusesThatCanReach('AVAILABLE') } },
      data: { status: 'AVAILABLE' },
    })
    if (count === 0) return false

    await tx.collection.update({
      where: { id: collection.id },
      data: { releasedAt: new Date(), releaseReason: reason },
    })
    await notify(
      tx,
      reason === 'GAVE_UP'
        ? { userId: ownerId, type: 'COLLECTION_GAVE_UP', occurrenceId, actorId: userId }
        : {
            userId: collection.collectorId,
            type: 'COLLECTION_RELEASED',
            occurrenceId,
            actorId: userId,
          },
    )
    return true
  })

  if (!released) {
    await getOccurrence(occurrenceId)
    throw new AppError(409, NO_OPEN_COLLECTION)
  }
  return getOccurrence(occurrenceId)
}

// O coletor desiste da coleta que assumiu
export function giveUpCollection(occurrenceId: string, collectorId: string) {
  return releaseCollection(occurrenceId, collectorId, 'GAVE_UP')
}

// O dono libera uma coleta parada (o coletor não apareceu)
export function releaseStalledCollection(occurrenceId: string, ownerId: string) {
  return releaseCollection(occurrenceId, ownerId, 'RELEASED_BY_OWNER')
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
        where: { ...OPEN_COLLECTION },
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
