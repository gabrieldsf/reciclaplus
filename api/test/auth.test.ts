import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { app, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

describe('POST /api/auth/register', () => {
  it('CT01 — cadastro válido cria o usuário e permite autenticar', async () => {
    const { res, body } = await registerUser({ email: 'Maria@Teste.com' })

    expect(res.status).toBe(201)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({ email: 'maria@teste.com', userType: 'PERSON' })
    expect(res.body.user).not.toHaveProperty('passwordHash')

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria@teste.com', password: body.password })
    expect(login.status).toBe(200)
  })

  it('armazena a senha como hash, nunca em texto puro', async () => {
    const { body } = await registerUser()
    const user = await prisma.user.findUniqueOrThrow({ where: { email: body.email } })

    expect(user.passwordHash).not.toBe(body.password)
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/)
  })

  it('permite cadastrar conta de empresa', async () => {
    const { res } = await registerUser({ userType: 'COMPANY' })

    expect(res.status).toBe(201)
    expect(res.body.user.userType).toBe('COMPANY')
  })

  it('não permite se cadastrar como administrador', async () => {
    const { res } = await registerUser({ userType: 'ADMIN' })

    expect(res.status).toBe(400)
  })

  it('CT02 — impede e-mail já cadastrado (sem diferenciar maiúsculas)', async () => {
    await registerUser({ email: 'joao@teste.com' })
    const { res } = await registerUser({ email: 'JOAO@teste.com' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('E-mail já cadastrado')
  })

  it('valida os campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'invalido', password: '123' })

    expect(res.status).toBe(400)
    const fields = res.body.errors.map((e: { field: string }) => e.field)
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']))
  })
})

describe('POST /api/auth/login', () => {
  it('CT03 — senha incorreta é negada com mensagem adequada', async () => {
    const { body } = await registerUser()
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'senha-errada' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('E-mail ou senha incorretos')
    expect(res.body).not.toHaveProperty('token')
  })

  it('CT03 — e-mail inexistente recebe a mesma mensagem', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.com', password: 'qualquer-coisa' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('E-mail ou senha incorretos')
  })
})

describe('GET /api/auth/me (rota protegida)', () => {
  it('retorna o usuário autenticado', async () => {
    const { token, body } = await registerUser()
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(body.email)
  })

  it('bloqueia acesso sem token', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
  })

  it('bloqueia token inválido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Sessão inválida ou expirada')
  })
})
