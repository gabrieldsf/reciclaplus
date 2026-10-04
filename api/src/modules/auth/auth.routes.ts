import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middlewares/require-auth.js'
import { loginSchema, registerSchema } from './auth.schemas.js'
import * as authService from './auth.service.js'
import * as verification from './email-verification.service.js'

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

const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código tem 6 números'),
})

authRouter.post('/verify-email', requireAuth, async (req, res) => {
  const { code } = verifySchema.parse(req.body)
  await verification.verifyCode(req.userId!, code)
  res.json({ user: await authService.getCurrentUser(req.userId!) })
})

authRouter.post('/verify-email/resend', requireAuth, async (req, res) => {
  await verification.resendVerificationCode(req.userId!)
  res.status(202).json({ message: 'Enviamos um novo código para o seu e-mail' })
})
