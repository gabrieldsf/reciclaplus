import { Router } from 'express'
import { z } from 'zod'
import { AppError } from '../../lib/errors.js'
import { getPhoto } from '../me/avatar.service.js'

export const usersRouter = Router()

// Foto de perfil pública. A URL tem a versão (?v=), então pode ficar em cache por 1 ano.
usersRouter.get('/:id/avatar', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  if (!id.success) throw new AppError(404, 'Foto não encontrada')

  const { bytes, type } = await getPhoto(id.data)
  res
    .type(type)
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .set('X-Content-Type-Options', 'nosniff')
    .send(bytes)
})
