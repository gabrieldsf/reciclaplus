import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { memoryOutbox } from '../src/lib/mailer.js'
import { prisma } from '../src/lib/prisma.js'
import { app, auth, findCategory, registerUser, resetDatabase, SAMPLE_LOCATION } from './helpers.js'

beforeEach(async () => {
  await resetDatabase()
  memoryOutbox.clear()
})

// Código de 6 dígitos do último e-mail enviado para o endereço
function codeSentTo(email: string) {
  const sent = memoryOutbox.lastTo(email)
  expect(sent, `nenhum e-mail para ${email}`).not.toBeNull()
  return sent!.text.match(/\b(\d{6})\b/)![1]!
}

const verify = (token: string, code: string) =>
  request(app).post('/api/auth/verify-email').set(auth(token)).send({ code })

const resend = (token: string) =>
  request(app).post('/api/auth/verify-email/resend').set(auth(token))

// Volta o horário do último envio, como se o tempo tivesse passado
async function pretendSentSecondsAgo(userId: string, seconds: number) {
  await prisma.emailVerification.update({
    where: { userId },
    data: { sentAt: new Date(Date.now() - seconds * 1000) },
  })
}

describe('confirmação de e-mail', () => {
  it('o cadastro envia um código e a conta começa sem confirmação', async () => {
    const { res, body } = await registerUser({}, { verified: false })

    expect(res.status).toBe(201)
    expect(res.body.user.emailVerified).toBe(false)
    const sent = memoryOutbox.lastTo(body.email)!
    expect(sent.subject).toMatch(/^\d{6} é o seu código do Recicla\+$/)
    expect(sent.html).toContain(codeSentTo(body.email))
  })

  it('o código não fica salvo em texto no banco', async () => {
    const { res, body } = await registerUser({}, { verified: false })
    const code = codeSentTo(body.email)

    const stored = await prisma.emailVerification.findUniqueOrThrow({
      where: { userId: res.body.user.id },
    })

    expect(stored.codeHash).not.toContain(code)
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('o código certo confirma o e-mail', async () => {
    const { token, body } = await registerUser({}, { verified: false })

    const res = await verify(token, codeSentTo(body.email))

    expect(res.status).toBe(200)
    expect(res.body.user.emailVerified).toBe(true)
    const me = await request(app).get('/api/auth/me').set(auth(token))
    expect(me.body.user.emailVerified).toBe(true)
  })

  it('código errado conta tentativas e bloqueia após 5', async () => {
    const { token, body } = await registerUser({}, { verified: false })
    const right = codeSentTo(body.email)
    const wrong = right === '000000' ? '111111' : '000000'

    const first = await verify(token, wrong)
    expect(first.status).toBe(400)
    expect(first.body.message).toBe('Código incorreto. Restam 4 tentativas.')

    for (let i = 0; i < 4; i++) await verify(token, wrong)

    // Nem o código certo vale mais: precisa pedir outro
    const blocked = await verify(token, right)
    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toBe('Muitas tentativas. Peça um novo código.')
  })

  it('código expirado não vale', async () => {
    const { token, body, res } = await registerUser({}, { verified: false })
    await prisma.emailVerification.update({
      where: { userId: res.body.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const result = await verify(token, codeSentTo(body.email))

    expect(result.status).toBe(400)
    expect(result.body.message).toBe('Código expirado. Peça um novo código.')
  })

  it('valida o formato do código', async () => {
    const { token } = await registerUser({}, { verified: false })

    expect((await verify(token, '12a')).status).toBe(400)
  })

  it('reenviar exige esperar 60 s e gera um código novo (o antigo deixa de valer)', async () => {
    const { token, body, res } = await registerUser({}, { verified: false })
    const oldCode = codeSentTo(body.email)

    const tooSoon = await resend(token)
    expect(tooSoon.status).toBe(429)
    expect(tooSoon.body.message).toMatch(/^Aguarde \d+ s para pedir um novo código$/)

    await pretendSentSecondsAgo(res.body.user.id, 61)
    expect((await resend(token)).status).toBe(202)
    const newCode = codeSentTo(body.email)

    if (newCode !== oldCode) expect((await verify(token, oldCode)).status).toBe(400)
    expect((await verify(token, newCode)).status).toBe(200)
  })

  it('não reenvia para quem já confirmou', async () => {
    const { token } = await registerUser()

    expect((await resend(token)).status).toBe(409)
  })

  it('exige login', async () => {
    expect(
      (await request(app).post('/api/auth/verify-email').send({ code: '123456' })).status,
    ).toBe(401)
  })
})

describe('sem e-mail confirmado não dá para informar nem coletar', () => {
  it('criar ocorrência é bloqueado com código EMAIL_NOT_VERIFIED', async () => {
    const { token } = await registerUser({}, { verified: false })
    const plastic = await findCategory('Plástico')

    const res = await request(app)
      .post('/api/occurrences')
      .set(auth(token))
      .send({ categoryId: plastic.id, ...SAMPLE_LOCATION })

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Confirme seu e-mail para continuar',
    })
  })

  it('assumir coleta é bloqueado; depois de confirmar, funciona', async () => {
    const owner = await registerUser()
    const plastic = await findCategory('Plástico')
    const created = await request(app)
      .post('/api/occurrences')
      .set(auth(owner.token))
      .send({ categoryId: plastic.id, ...SAMPLE_LOCATION })
    const id = created.body.occurrence.id
    const collector = await registerUser({}, { verified: false })

    const blocked = await request(app)
      .post(`/api/occurrences/${id}/claim`)
      .set(auth(collector.token))
    expect(blocked.status).toBe(403)

    await verify(collector.token, codeSentTo(collector.body.email))
    const allowed = await request(app)
      .post(`/api/occurrences/${id}/claim`)
      .set(auth(collector.token))
    expect(allowed.status).toBe(200)
  })

  it('ver o mapa e os detalhes continua liberado', async () => {
    const { token } = await registerUser({}, { verified: false })

    expect((await request(app).get('/api/occurrences').set(auth(token))).status).toBe(200)
    expect((await request(app).get('/api/me/occurrences').set(auth(token))).status).toBe(200)
  })
})
