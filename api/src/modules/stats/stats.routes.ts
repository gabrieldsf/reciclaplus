import { Router } from 'express'
import { getPlatformStats } from './stats.service.js'

// Painel público: indicadores agregados, sem dados pessoais
export const statsRouter = Router()

statsRouter.get('/', async (_req, res) => {
  res.json(await getPlatformStats())
})
