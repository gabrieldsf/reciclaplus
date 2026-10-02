import { Router } from 'express'
import { requireAuth } from '../../middlewares/require-auth.js'
import * as meService from './me.service.js'

// Histórico do usuário autenticado
export const meRouter = Router()

meRouter.use(requireAuth)

meRouter.get('/occurrences', async (req, res) => {
  res.json({ occurrences: await meService.listMyOccurrences(req.userId!) })
})

meRouter.get('/collections', async (req, res) => {
  res.json({ collections: await meService.listMyCollections(req.userId!) })
})
