import type { Prisma } from '../../generated/prisma/client.js'
import { avatarSelect, withAvatarUrl } from '../../lib/avatars.js'
import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { assertUsablePhoto, photoUrl } from '../photos/photos.service.js'
import { notify } from '../notifications/notifications.service.js'
import { OPEN_COLLECTION, statusesThatCanReach } from './occurrence-status.js'
import type {
  CreateOccurrenceInput,
  ListOccurrencesQuery,
  UpdateOccurrenceInput,
} from './occurrences.schemas.js'

// Dados públicos de uma pessoa (sem e-mail)
const personSelect = { id: true, name: true, userType: true, ...avatarSelect } as const

// Dados públicos da ocorrência (sem e-mail de quem registrou)
export const occurrenceBaseSelect = {
  id: true,
  description: true,
  estimatedQuantity: true,
  latitude: true,
  longitude: true,
  photoId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
  user: { select: personSelect },
} satisfies Prisma.OccurrenceSelect

export const occurrenceSelect = {
  ...occurrenceBaseSelect,
  // Todas as coletas, da mais antiga para a mais recente (são poucas por ocorrência:
  // só há mais de uma quando alguém desistiu ou o dono liberou)
  collections: {
    orderBy: { acceptedAt: 'asc' },
    select: {
      id: true,
      acceptedAt: true,
      completedAt: true,
      cancelledAt: true,
      releasedAt: true,
      releaseReason: true,
      collectedQuantity: true,
      observation: true,
      photoId: true,
      collector: { select: personSelect },
    },
  },
} satisfies Prisma.OccurrenceSelect

type SelectedOccurrence = Prisma.OccurrenceGetPayload<{ select: typeof occurrenceSelect }>

type BaseOccurrence = Prisma.OccurrenceGetPayload<{ select: typeof occurrenceBaseSelect }>

// Campos internos viram URLs: `photoId` → `photoUrl`, avatar da pessoa → `avatarUrl`
export function toBaseOccurrenceResponse({ photoId, ...occurrence }: BaseOccurrence) {
  return { ...occurrence, photoUrl: photoUrl(photoId), user: withAvatarUrl(occurrence.user) }
}

// Formato devolvido pela API:
//   collection          → a coleta atual (em andamento, concluída ou cancelada) ou null
//   releasedCollections → coletas desfeitas antes (desistência ou liberação pelo dono)
export function toOccurrenceResponse({ collections, ...occurrence }: SelectedOccurrence) {
  const current = collections.findLast((c) => c.releasedAt === null)
  let collection = null
  if (current) {
    const { photoId, releasedAt: _, releaseReason: __, ...rest } = current
    collection = { ...rest, photoUrl: photoUrl(photoId), collector: withAvatarUrl(rest.collector) }
  }
  const releasedCollections = collections
    .filter((c) => c.releasedAt !== null)
    .map((c) => ({
      id: c.id,
      acceptedAt: c.acceptedAt,
      releasedAt: c.releasedAt!,
      releaseReason: c.releaseReason!,
      collector: withAvatarUrl(c.collector),
    }))
  return { ...toBaseOccurrenceResponse(occurrence), collection, releasedCollections }
}

const MAX_LIST_RESULTS = 500

// Garante que a categoria existe e que a subcategoria (se houver) pertence a ela
async function assertValidCategory(categoryId: number, subcategoryId?: number | null) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { subcategories: { select: { id: true } } },
  })
  if (!category) throw new AppError(400, 'Categoria inválida')

  if (subcategoryId != null && !category.subcategories.some((s) => s.id === subcategoryId)) {
    throw new AppError(400, 'Subcategoria não pertence à categoria informada')
  }
}

// Explica por que uma alteração condicional não afetou nenhuma linha
async function explainRejectedChange(
  id: string,
  userId: string,
  conflictMessage: string,
): Promise<never> {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!occurrence) throw new AppError(404, 'Ocorrência não encontrada')
  if (occurrence.userId !== userId) {
    throw new AppError(403, 'Somente quem registrou a ocorrência pode alterá-la')
  }
  throw new AppError(409, conflictMessage)
}

export async function createOccurrence(userId: string, input: CreateOccurrenceInput) {
  await assertValidCategory(input.categoryId, input.subcategoryId)
  if (input.photoId) await assertUsablePhoto(input.photoId, userId)

  // RN01 (usuário autenticado) e RN03 (status inicial AVAILABLE, padrão do banco)
  const occurrence = await prisma.occurrence.create({
    data: { ...input, userId },
    select: occurrenceSelect,
  })
  return toOccurrenceResponse(occurrence)
}

export async function listOccurrences(query: ListOccurrencesQuery) {
  const occurrences = await prisma.occurrence.findMany({
    where: {
      status: { in: query.status },
      ...(query.categoryId && { categoryId: { in: query.categoryId } }),
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_LIST_RESULTS,
    select: occurrenceSelect,
  })
  return occurrences.map(toOccurrenceResponse)
}

export async function getOccurrence(id: string) {
  const occurrence = await prisma.occurrence.findUnique({ where: { id }, select: occurrenceSelect })
  if (!occurrence) throw new AppError(404, 'Ocorrência não encontrada')
  return toOccurrenceResponse(occurrence)
}

const EDIT_CONFLICT = 'Somente ocorrências disponíveis podem ser editadas'

export async function updateOccurrence(id: string, userId: string, input: UpdateOccurrenceInput) {
  const current = await prisma.occurrence.findUnique({
    where: { id },
    select: { userId: true, status: true, categoryId: true, subcategoryId: true },
  })
  if (!current || current.userId !== userId || current.status !== 'AVAILABLE') {
    return explainRejectedChange(id, userId, EDIT_CONFLICT)
  }

  if (input.categoryId !== undefined || input.subcategoryId !== undefined) {
    // Trocar a categoria sem informar subcategoria limpa a subcategoria antiga
    const categoryChanged =
      input.categoryId !== undefined && input.categoryId !== current.categoryId
    const subcategoryId =
      input.subcategoryId !== undefined
        ? input.subcategoryId
        : categoryChanged
          ? null
          : current.subcategoryId
    input = { ...input, subcategoryId }
    await assertValidCategory(input.categoryId ?? current.categoryId, subcategoryId)
  }
  // Trocar a foto: só por uma enviada pela própria pessoa (null remove a foto)
  if (input.photoId) await assertUsablePhoto(input.photoId, userId, { occurrenceId: id })

  // Condicional de novo: o status pode ter mudado (ex.: alguém assumiu) desde a leitura acima
  const { count } = await prisma.occurrence.updateMany({
    where: { id, userId, status: 'AVAILABLE' },
    data: input,
  })
  if (count === 0) await explainRejectedChange(id, userId, EDIT_CONFLICT)
  return getOccurrence(id)
}

export async function cancelOccurrence(id: string, userId: string) {
  const count = await prisma.$transaction(async (tx) => {
    // AVAILABLE → CANCELLED e IN_COLLECTION → CANCELLED (seção 9)
    const { count } = await tx.occurrence.updateMany({
      where: { id, userId, status: { in: statusesThatCanReach('CANCELLED') } },
      data: { status: 'CANCELLED' },
    })
    // Decisão do projeto: a coleta em andamento fica registrada como cancelada
    // e o coletor não pode mais finalizá-la (e é avisado)
    if (count > 0) {
      const open = await tx.collection.findMany({
        where: { occurrenceId: id, ...OPEN_COLLECTION },
        select: { collectorId: true },
      })
      await tx.collection.updateMany({
        where: { occurrenceId: id, ...OPEN_COLLECTION },
        data: { cancelledAt: new Date() },
      })
      for (const { collectorId } of open) {
        await notify(tx, {
          userId: collectorId,
          type: 'OCCURRENCE_CANCELLED',
          occurrenceId: id,
          actorId: userId,
        })
      }
    }
    return count
  })
  if (count === 0) {
    await explainRejectedChange(id, userId, 'Esta ocorrência não pode mais ser cancelada')
  }
  return getOccurrence(id)
}
