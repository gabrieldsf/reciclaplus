import { detectImageType } from '../../lib/avatars.js'
import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'

// O app reduz a foto para no máximo 800 px (~80–150 KB); o limite cobre folga
export const MAX_PHOTO_BYTES = 600 * 1024

// Fotos enviadas mas nunca usadas (ex.: a pessoa desistiu de informar) são apagadas depois disso
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000

export const photoUrl = (photoId: string | null) => (photoId ? `/api/photos/${photoId}` : null)

export async function uploadPhoto(userId: string, body: unknown) {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError(400, 'Envie uma imagem JPEG, PNG ou WebP')
  }
  const contentType = detectImageType(body)
  if (!contentType) throw new AppError(400, 'Envie uma imagem JPEG, PNG ou WebP')

  // Faxina: fotos antigas desta pessoa que nunca foram ligadas a nada
  await prisma.photo.deleteMany({
    where: {
      uploadedBy: userId,
      createdAt: { lt: new Date(Date.now() - ORPHAN_TTL_MS) },
      occurrence: null,
      collection: null,
    },
  })

  const photo = await prisma.photo.create({
    data: { uploadedBy: userId, data: new Uint8Array(body), contentType, sizeBytes: body.length },
    select: { id: true },
  })
  return { id: photo.id, url: photoUrl(photo.id)! }
}

// Só a própria pessoa pode usar a foto que enviou, e uma foto vale para um só lugar
// (`allowLinkedTo` permite manter a foto que já é desta ocorrência numa edição)
export async function assertUsablePhoto(
  photoId: string,
  userId: string,
  allowLinkedTo?: { occurrenceId?: string },
) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      uploadedBy: true,
      occurrence: { select: { id: true } },
      collection: { select: { id: true } },
    },
  })
  const linkedElsewhere =
    photo?.collection || (photo?.occurrence && photo.occurrence.id !== allowLinkedTo?.occurrenceId)
  if (!photo || photo.uploadedBy !== userId || linkedElsewhere) {
    throw new AppError(400, 'Foto inválida. Envie a foto novamente.', [
      { field: 'photoId', message: 'Foto inválida' },
    ])
  }
}

export async function getPhoto(id: string) {
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { data: true, contentType: true },
  })
  if (!photo) throw new AppError(404, 'Foto não encontrada')
  return { bytes: Buffer.from(photo.data), type: photo.contentType }
}
