// "Esqueci minha senha": código por e-mail + senha nova
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { memoryOutbox } from '../src/lib/mailer.js'
import { prisma } from '../src/lib/prisma.js'
import { app, registerUser, resetDatabase } from './helpers.js'

beforeEach(async () => {
  await resetDatabase()
  memoryOutbox.clear()
})

const forgot = (email: string) => request(app).post('/api/auth/password/forgot').send({ email })

const reset = (body: object) => request(app).post('/api/auth/password/reset').send(body)

const login = (email: string, password: string) =>
  request(app).post('/api/auth/login').send({ email, password })

// Último código de troca de senha enviado para o e-mail
function codeSentTo(email: string) {
  const sent = memoryOutbox.lastTo(email)
  expect(sent?.subject).toContain('trocar a senha')
  return sent!.text.match(/\b(\d{6})\b/)![1]!
}

describe('POST /api/auth/password/forgot', () => {
  it('envia um código para o e-mail cadastrado', async () => {
    const { body } = await registerUser()

    const res = await forgot(body.email)

    expect(res.status).toBe(202)
    expect(codeSentTo(body.email)).toMatch(/^\d{6}$/)
  })

  it('mesma resposta para e-mail sem conta (não revela quem tem cadastro)', async () => {
    const { body } = await registerUser()
    const known = await forgot(body.email)

    const unknown = await forgot('ninguem@teste.com')

    expect(unknown.status).toBe(202)
    expect(unknown.body).toEqual(known.body)
    expect(memoryOutbox.lastTo('ninguem@teste.com')).toBeNull()
  })

  it('pedidos repetidos em menos de 1 minuto não enviam outro e-mail', async () => {
    const { body } = await registerUser()
    await forgot(body.email)
    const before = memoryOutbox.all().length

    const res = await forgot(body.email)

    expect(res.status).toBe(202)
    expect(memoryOutbox.all()).toHaveLength(before)
  })
})

describe('POST /api/auth/password/reset', () => {
  it('troca a senha, já entra no app e a senha antiga para de funcionar', async () => {
    const { body } = await registerUser()
    await forgot(body.email)

    const res = await reset({
      email: body.email,
      code: codeSentTo(body.email),
      password: 'nova-senha-456',
    })

    expect(res.status).toBe(200)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({ email: body.email })
    expect((await login(body.email, body.password)).status).toBe(401)
    expect((await login(body.email, 'nova-senha-456')).status).toBe(200)
  })

  it('o código só vale uma vez', async () => {
    const { body } = await registerUser()
    await forgot(body.email)
    const code = codeSentTo(body.email)
    await reset({ email: body.email, code, password: 'nova-senha-456' })

    const again = await reset({ email: body.email, code, password: 'outra-senha-789' })

    expect(again.status).toBe(400)
  })

  it('código errado conta tentativas e, depois de 5, bloqueia', async () => {
    const { body } = await registerUser()
    await forgot(body.email)
    const code = codeSentTo(body.email)
    const wrong = code === '000000' ? '111111' : '000000'

    const first = await reset({ email: body.email, code: wrong, password: 'nova-senha-456' })
    expect(first.status).toBe(400)
    expect(first.body.message).toBe('Código incorreto. Restam 4 tentativas.')
    for (let i = 0; i < 4; i++) {
      await reset({ email: body.email, code: wrong, password: 'nova-senha-456' })
    }

    const blocked = await reset({ email: body.email, code, password: 'nova-senha-456' })
    expect(blocked.status).toBe(429)
    expect((await login(body.email, body.password)).status).toBe(200)
  })

  it('código expirado não vale', async () => {
    const { body } = await registerUser()
    await forgot(body.email)
    const code = codeSentTo(body.email)
    await prisma.passwordReset.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })

    const res = await reset({ email: body.email, code, password: 'nova-senha-456' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Código incorreto ou expirado. Peça um novo código.')
  })

  it('o código de confirmação de e-mail não serve para trocar a senha', async () => {
    const { body } = await registerUser({}, { verified: false })
    const verificationCode = memoryOutbox.lastTo(body.email)!.text.match(/\b(\d{6})\b/)![1]
    await forgot(body.email)

    const res = await reset({
      email: body.email,
      code: verificationCode,
      password: 'nova-senha-456',
    })

    // Só passaria se os dois códigos coincidissem por acaso
    if (verificationCode !== codeSentTo(body.email)) expect(res.status).toBe(400)
  })

  it('trocar a senha também confirma o e-mail (o código chegou nele)', async () => {
    const { body } = await registerUser({}, { verified: false })
    await forgot(body.email)

    const res = await reset({
      email: body.email,
      code: codeSentTo(body.email),
      password: 'nova-senha-456',
    })

    expect(res.body.user.emailVerified).toBe(true)
  })

  it('valida a senha nova', async () => {
    const { body } = await registerUser()
    await forgot(body.email)

    const res = await reset({ email: body.email, code: codeSentTo(body.email), password: '123' })

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual([
      expect.objectContaining({
        field: 'password',
        message: 'Senha deve ter ao menos 8 caracteres',
      }),
    ])
  })
})
