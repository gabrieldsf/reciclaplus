import type { RequestHandler } from 'express'
import { AppError } from '../lib/errors.js'
import { verifyToken } from '../lib/jwt.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// Exige "Authorization: Bearer <token>" e expõe o id do usuário em req.userId
export const requireAuth: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? []
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Autenticação necessária')
  }

  try {
    req.userId = verifyToken(token).sub
  } catch {
    throw new AppError(401, 'Sessão inválida ou expirada')
  }
  next()
}
