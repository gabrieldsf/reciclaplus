import cors from 'cors'
import express from 'express'
import { errorHandler } from './middlewares/error-handler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { healthRouter } from './routes/health.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173' }))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' })
  })
  app.use(errorHandler)

  return app
}
