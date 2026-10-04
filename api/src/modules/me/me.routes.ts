import express, { Router } from 'express'
import { requireAuth } from '../../middlewares/require-auth.js'
import * as avatarService from './avatar.service.js'
import * as meService from './me.service.js'

// Dados do usuário autenticado: histórico e foto de perfil
export const meRouter = Router()

meRouter.use(requireAuth)

meRouter.get('/occurrences', async (req, res) => {
  res.json({ occurrences: await meService.listMyOccurrences(req.userId!) })
})

meRouter.get('/collections', async (req, res) => {
  res.json({ collections: await meService.listMyCollections(req.userId!) })
})

// Avatar pronto: { "preset": "garrafa" }
meRouter.put('/avatar', async (req, res) => {
  const { preset } = avatarService.presetSchema.parse(req.body)
  res.json({ user: await avatarService.choosePreset(req.userId!, preset) })
})

// Foto enviada: corpo binário (image/jpeg, image/png ou image/webp)
meRouter.put(
  '/avatar/photo',
  express.raw({ type: () => true, limit: avatarService.MAX_AVATAR_BYTES }),
  async (req, res) => {
    res.json({ user: await avatarService.uploadPhoto(req.userId!, req.body) })
  },
)

meRouter.delete('/avatar', async (req, res) => {
  res.json({ user: await avatarService.removeAvatar(req.userId!) })
})
