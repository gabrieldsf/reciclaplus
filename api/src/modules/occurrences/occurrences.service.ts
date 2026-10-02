import type { Prisma } from '../../generated/prisma/client.js'
import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { statusesThatCanReach } from './occurrence-status.js'
import type {
  CreateOccurrenceInput,
  ListOccurrencesQuery,
  UpdateOccurrenceInput,
} from './occurrences.schemas.js'

// Dados públicos da ocorrência (sem e-mail de quem registrou)
export const occurrenceSelect = {
  id: true,
  description: true,
  estimatedQuantity: true,
  latitude: true,
  longitude: true,
  photoUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, userType: true } },
  // Coleta mais recente (em andamento, concluída ou cancelada junto com a ocorrência)
  collections: {
    orderBy: { acceptedAt: 'desc' },
    take: 1,
    select: {
      id: true,
      acceptedAt: true,
      completedAt: true,
      cancelledAt: true,
      collectedQuantity: true,
      observation: true,
      collector: { select: { id: true, name: true, userType: true } },
    },
  },
} satisfies Prisma.OccurrenceSelect

type SelectedOccurrence = Prisma.OccurrenceGetPayload<{ select: typeof occurrenceSelect }>

// Formato devolvido pela API: a coleta mais recente vira `collection` (ou null)
export function toOccurrenceResponse({ collections, ...occurrence }: SelectedOccurrence) {
  return { ...occurrence, collection: collections[0] ?? null }
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
    // e o coletor não pode mais finalizá-la
    if (count > 0) {
      await tx.collection.updateMany({
        where: { occurrenceId: id, completedAt: null, cancelledAt: null },
        data: { cancelledAt: new Date() },
      })
    }
    return count
  })
  if (count === 0) {
    await explainRejectedChange(id, userId, 'Esta ocorrência não pode mais ser cancelada')
  }
  return getOccurrence(id)
}
