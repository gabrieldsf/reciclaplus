import { z } from 'zod'

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'))

const newPassword = z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(72)

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  email,
  password: newPassword,
  // ADMIN não pode ser escolhido no cadastro
  userType: z.enum(['PERSON', 'COMPANY']).default('PERSON'),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código tem 6 números'),
  password: newPassword,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
