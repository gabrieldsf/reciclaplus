import type { RequestHandler } from 'express'
import { AppError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'

// Usar depois de requireAuth: informar e coletar exigem e-mail confirmado
export const requireVerifiedEmail: RequestHandler = async (req, _res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { emailVerifiedAt: true },
  })
  if (!user) throw new AppError(401, 'Sessão inválida ou expirada')
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'Confirme seu e-mail para continuar', [], 'EMAIL_NOT_VERIFIED')
  }
  next()
}
