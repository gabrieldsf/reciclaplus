import express, { Router } from 'express'
import { z } from 'zod'
import { AppError } from '../../lib/errors.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireVerifiedEmail } from '../../middlewares/require-verified-email.js'
import * as photosService from './photos.service.js'

export const photosRouter = Router()

// Envio: corpo binário (image/jpeg, image/png ou image/webp). Devolve o id para usar
// ao informar a ocorrência ou ao finalizar a coleta.
photosRouter.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  express.raw({ type: () => true, limit: photosService.MAX_PHOTO_BYTES }),
  async (req, res) => {
    res.status(201).json({ photo: await photosService.uploadPhoto(req.userId!, req.body) })
  },
)

// Exibição: o conteúdo de um id nunca muda, então o navegador guarda por 1 ano
photosRouter.get('/:id', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  if (!id.success) throw new AppError(404, 'Foto não encontrada')

  const { bytes, type } = await photosService.getPhoto(id.data)
  res
    .type(type)
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .set('X-Content-Type-Options', 'nosniff')
    .send(bytes)
})
