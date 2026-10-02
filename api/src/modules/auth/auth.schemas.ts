import { z } from 'zod'

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'))

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  email,
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(72),
  // ADMIN não pode ser escolhido no cadastro
  userType: z.enum(['PERSON', 'COMPANY']).default('PERSON'),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
