// "Esqueci minha senha": código de 6 dígitos por e-mail, depois a senha nova
import bcrypt from 'bcryptjs'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../lib/errors.js'
import { signToken } from '../../lib/jwt.js'
import { sendEmail } from '../../lib/mailer.js'
import { prisma } from '../../lib/prisma.js'
import { publicUserSelect, SALT_ROUNDS, toPublicUser } from './auth.service.js'
import {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
} from './email-verification.service.js'

// Prefixo diferente do código de confirmação: um não serve no lugar do outro
function hashCode(userId: string, code: string) {
  return createHash('sha256').update(`reset:${userId}:${code}`).digest('hex')
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function resetEmail(name: string, code: string) {
  const firstName = name.split(' ')[0] ?? name
  return {
    subject: `${code} é o seu código para trocar a senha do Recicla+`,
    text: `Olá, ${firstName}!\n\nSeu código para criar uma nova senha no Recicla+ é: ${code}\n\nEle vale por ${CODE_TTL_MINUTES} minutos. Se você não pediu para trocar a senha, ignore este e-mail: sua senha atual continua valendo.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b4332">
  <h1 style="font-size:20px;margin:0 0 16px">♻️ Recicla+</h1>
  <p>Olá, ${escapeHtml(firstName)}!</p>
  <p>Use este código para criar uma nova senha:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#edf7ef;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</p>
  <p style="font-size:14px;color:#2d6a4f">Ele vale por ${CODE_TTL_MINUTES} minutos. Se você não pediu para trocar a senha, ignore este e-mail: sua senha atual continua valendo.</p>
</div>`,
  }
}

// Sempre "dá certo" para quem chama: a resposta não revela se o e-mail tem conta.
// Pedidos repetidos dentro do intervalo mínimo são ignorados em silêncio.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordReset: { select: { sentAt: true } } },
  })
  if (!user) return

  const sentAt = user.passwordReset?.sentAt
  if (sentAt && Date.now() - sentAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) return

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const data = {
    codeHash: hashCode(user.id, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: new Date(),
  }
  await prisma.passwordReset.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })
  await sendEmail({ to: user.email, ...resetEmail(user.name, code) })
}

const INVALID_CODE = 'Código incorreto ou expirado. Peça um novo código.'

// Confere o código e troca a senha; devolve a sessão (a pessoa já entra no app)
export async function resetPassword(email: string, code: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true, passwordReset: true },
  })
  const pending = user?.passwordReset
  if (!user || !pending || pending.expiresAt < new Date()) {
    throw new AppError(400, INVALID_CODE, [{ field: 'code', message: INVALID_CODE }])
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new AppError(429, 'Muitas tentativas. Peça um novo código.')
  }

  const expected = Buffer.from(pending.codeHash, 'hex')
  const received = Buffer.from(hashCode(user.id, code), 'hex')
  if (!timingSafeEqual(expected, received)) {
    await prisma.passwordReset.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } },
    })
    const left = MAX_ATTEMPTS - pending.attempts - 1
    const message =
      left > 0
        ? `Código incorreto. Restam ${left} tentativas.`
        : 'Muitas tentativas. Peça um novo código.'
    throw new AppError(400, message, [{ field: 'code', message: 'Código incorreto' }])
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Receber o código prova que o e-mail é da pessoa: vale como confirmação
      data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      select: publicUserSelect,
    }),
    prisma.passwordReset.delete({ where: { userId: user.id } }),
    prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
  ])
  return { user: toPublicUser(updated), token: signToken(user.id) }
}
