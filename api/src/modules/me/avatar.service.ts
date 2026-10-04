import { z } from 'zod'
import { AVATAR_PRESETS, detectImageType } from '../../lib/avatars.js'
import { AppError } from '../../lib/errors.js'
import { prisma } from '../../lib/prisma.js'
import { getCurrentUser } from '../auth/auth.service.js'

// O front redimensiona para 256×256 antes de enviar (~20 KB); o limite cobre folga
export const MAX_AVATAR_BYTES = 300 * 1024

export const presetSchema = z.object({
  preset: z.enum(AVATAR_PRESETS, { error: 'Avatar inválido' }),
})

const clearImage = { avatarImage: null, avatarImageType: null }

export async function choosePreset(userId: string, preset: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { ...clearImage, avatarPreset: preset, avatarUpdatedAt: new Date() },
  })
  return getCurrentUser(userId)
}

export async function uploadPhoto(userId: string, body: unknown) {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new AppError(400, 'Envie uma imagem JPEG, PNG ou WebP')
  }
  const type = detectImageType(body)
  if (!type) throw new AppError(400, 'Envie uma imagem JPEG, PNG ou WebP')

  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarPreset: null,
      avatarImage: new Uint8Array(body),
      avatarImageType: type,
      avatarUpdatedAt: new Date(),
    },
  })
  return getCurrentUser(userId)
}

export async function removeAvatar(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { ...clearImage, avatarPreset: null, avatarUpdatedAt: new Date() },
  })
  return getCurrentUser(userId)
}

export async function getPhoto(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarImage: true, avatarImageType: true },
  })
  if (!user?.avatarImage || !user.avatarImageType) {
    throw new AppError(404, 'Foto não encontrada')
  }
  return { bytes: Buffer.from(user.avatarImage), type: user.avatarImageType }
}
