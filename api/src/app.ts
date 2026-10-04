import cors from 'cors'
import express from 'express'
import { errorHandler } from './middlewares/error-handler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { categoriesRouter } from './modules/categories/categories.routes.js'
import { meRouter } from './modules/me/me.routes.js'
import { occurrencesRouter } from './modules/occurrences/occurrences.routes.js'
import { photosRouter } from './modules/photos/photos.routes.js'
import { statsRouter } from './modules/stats/stats.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { transport } from './lib/mailer.js'
import { devOutboxRouter } from './routes/dev-outbox.js'
import { healthRouter } from './routes/health.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173' }))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/occurrences', occurrencesRouter)
  app.use('/api/me', meRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/photos', photosRouter)
  // Caixa de saída simulada: só para testes, nunca em produção
  if (transport() === 'memory' && process.env['NODE_ENV'] !== 'production') {
    app.use('/api/dev/outbox', devOutboxRouter)
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' })
  })
  app.use(errorHandler)

  return app
}
