import bcrypt from 'bcryptjs'
import { Prisma } from '../../generated/prisma/client.js'
import { AppError } from '../../lib/errors.js'
import { signToken } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'

const SALT_ROUNDS = 10

// Campos do usuário que podem ser devolvidos pela API (nunca o hash da senha)
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  userType: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, userType: input.userType },
      select: publicUserSelect,
    })
    return { user, token: signToken(user.id) }
  } catch (err) {
    // Violação do índice único de e-mail (inclusive em cadastros simultâneos)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'E-mail já cadastrado')
    }
    throw err
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })

  // Mesma mensagem para e-mail inexistente e senha errada, para não revelar contas
  const valid = user && (await bcrypt.compare(input.password, user.passwordHash))
  if (!user || !valid) {
    throw new AppError(401, 'E-mail ou senha incorretos')
  }

  const { id, name, email, userType, createdAt } = user
  return { user: { id, name, email, userType, createdAt }, token: signToken(id) }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) throw new AppError(401, 'Sessão inválida ou expirada')
  return user
}
