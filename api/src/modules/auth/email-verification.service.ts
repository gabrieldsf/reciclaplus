// Confirmação de e-mail por código de 6 dígitos
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../lib/errors.js'
import { sendEmail } from '../../lib/mailer.js'
import { prisma } from '../../lib/prisma.js'

export const CODE_TTL_MINUTES = 15
export const MAX_ATTEMPTS = 5
export const RESEND_COOLDOWN_SECONDS = 60

// O código nunca é guardado em texto: só o hash (ligado ao usuário)
function hashCode(userId: string, code: string) {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex')
}

// O nome vem do cadastro: escapado para não injetar HTML no e-mail
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function verificationEmail(name: string, code: string) {
  const firstName = name.split(' ')[0] ?? name
  return {
    subject: `${code} é o seu código do Recicla+`,
    text: `Olá, ${firstName}!\n\nSeu código de confirmação do Recicla+ é: ${code}\n\nEle vale por ${CODE_TTL_MINUTES} minutos. Se você não criou uma conta, ignore este e-mail.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b4332">
  <h1 style="font-size:20px;margin:0 0 16px">♻️ Recicla+</h1>
  <p>Olá, ${escapeHtml(firstName)}!</p>
  <p>Use este código para confirmar seu e-mail:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#edf7ef;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</p>
  <p style="font-size:14px;color:#2d6a4f">Ele vale por ${CODE_TTL_MINUTES} minutos. Se você não criou uma conta, ignore este e-mail.</p>
</div>`,
  }
}

// Gera um código novo (substituindo o anterior) e envia por e-mail
export async function sendVerificationCode(user: { id: string; name: string; email: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const data = {
    codeHash: hashCode(user.id, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: new Date(),
  }
  await prisma.emailVerification.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })
  await sendEmail({ to: user.email, ...verificationEmail(user.name, code) })
}

export async function resendVerificationCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true, emailVerification: true },
  })
  if (!user) throw new AppError(401, 'Sessão inválida ou expirada')
  if (user.emailVerifiedAt) throw new AppError(409, 'Seu e-mail já está confirmado')

  const sentAt = user.emailVerification?.sentAt
  const wait = sentAt
    ? RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt.getTime()) / 1000)
    : 0
  if (wait > 0) throw new AppError(429, `Aguarde ${wait} s para pedir um novo código`)

  await sendVerificationCode(user)
}

export async function verifyCode(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, emailVerification: true },
  })
  if (!user) throw new AppError(401, 'Sessão inválida ou expirada')
  if (user.emailVerifiedAt) return

  const pending = user.emailVerification
  if (!pending) throw new AppError(400, 'Peça um novo código')
  if (pending.expiresAt < new Date()) {
    throw new AppError(400, 'Código expirado. Peça um novo código.')
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new AppError(429, 'Muitas tentativas. Peça um novo código.')
  }

  const expected = Buffer.from(pending.codeHash, 'hex')
  const received = Buffer.from(hashCode(userId, code), 'hex')
  if (!timingSafeEqual(expected, received)) {
    await prisma.emailVerification.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    })
    const left = MAX_ATTEMPTS - pending.attempts - 1
    throw new AppError(
      400,
      left > 0
        ? `Código incorreto. Restam ${left} tentativas.`
        : 'Muitas tentativas. Peça um novo código.',
      [{ field: 'code', message: 'Código incorreto' }],
    )
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerification.delete({ where: { userId } }),
  ])
}
