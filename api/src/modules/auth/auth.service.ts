import bcrypt from 'bcryptjs'
import { Prisma } from '../../generated/prisma/client.js'
import { avatarSelect, withAvatarUrl } from '../../lib/avatars.js'
import { domainAcceptsEmail } from '../../lib/email-domain.js'
import { AppError } from '../../lib/errors.js'
import { signToken } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'
import { sendVerificationCode } from './email-verification.service.js'

export const SALT_ROUNDS = 10

// Campos do usuário que podem ser devolvidos pela API (nunca o hash da senha)
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  userType: true,
  createdAt: true,
  emailVerifiedAt: true,
  ...avatarSelect,
} satisfies Prisma.UserSelect

type SelectedUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>

// Na resposta, a data de confirmação vira apenas "confirmou ou não"
export function toPublicUser({ emailVerifiedAt, ...user }: SelectedUser) {
  return { ...withAvatarUrl(user), emailVerified: emailVerifiedAt !== null }
}

const INVALID_DOMAIN =
  'Este domínio de e-mail não existe ou não recebe mensagens. Confira o endereço.'

export async function register(input: RegisterInput) {
  const domain = input.email.split('@')[1] ?? ''
  if (!(await domainAcceptsEmail(domain))) {
    throw new AppError(400, INVALID_DOMAIN, [{ field: 'email', message: INVALID_DOMAIN }])
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, userType: input.userType },
      select: publicUserSelect,
    })
    // Falha no envio não desfaz o cadastro: a pessoa pode pedir o código de novo
    await sendVerificationCode(user).catch((err) =>
      console.error('Falha ao enviar código de confirmação:', err),
    )
    return { user: toPublicUser(user), token: signToken(user.id) }
  } catch (err) {
    // Violação do índice único de e-mail (inclusive em cadastros simultâneos)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'E-mail já cadastrado')
    }
    throw err
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  })

  // Mesma mensagem para e-mail inexistente e senha errada, para não revelar contas
  const valid = user && (await bcrypt.compare(input.password, user.passwordHash))
  if (!user || !valid) {
    throw new AppError(401, 'E-mail ou senha incorretos')
  }

  const { passwordHash: _, ...publicUser } = user
  return { user: toPublicUser(publicUser), token: signToken(user.id) }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) throw new AppError(401, 'Sessão inválida ou expirada')
  return toPublicUser(user)
}
