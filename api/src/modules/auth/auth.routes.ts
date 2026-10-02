import { Router } from 'express'
import { requireAuth } from '../../middlewares/require-auth.js'
import { loginSchema, registerSchema } from './auth.schemas.js'
import * as authService from './auth.service.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body)
  res.status(201).json(await authService.register(input))
})

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  res.json(await authService.login(input))
})

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await authService.getCurrentUser(req.userId!) })
})
