import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

export const app = createApp()

// Limpa os dados criados pelos testes, preservando categorias
export async function resetDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE collections, occurrences, users CASCADE`
}

let counter = 0

export async function registerUser(overrides: Partial<Record<string, string>> = {}) {
  counter += 1
  const body = {
    name: `Usuário ${counter}`,
    email: `usuario${counter}@teste.com`,
    password: 'senha-segura-123',
    ...overrides,
  }
  const res = await request(app).post('/api/auth/register').send(body)
  return { res, body, token: res.body.token as string }
}
