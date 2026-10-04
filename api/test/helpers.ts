import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

export const app = createApp()

// Limpa os dados criados pelos testes, preservando categorias
export async function resetDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE collections, occurrences, users CASCADE`
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Categoria e subcategoria do seed, buscadas pelo nome
export async function findCategory(name: string) {
  return prisma.category.findUniqueOrThrow({
    where: { name },
    include: { subcategories: { orderBy: { id: 'asc' } } },
  })
}

// Praça da Sé, São Paulo
export const SAMPLE_LOCATION = { latitude: -23.5505, longitude: -46.6333 }

export async function createOccurrence(token: string, overrides: Record<string, unknown> = {}) {
  const plastic = await findCategory('Plástico')
  const res = await request(app)
    .post('/api/occurrences')
    .set(auth(token))
    .send({
      categoryId: plastic.id,
      subcategoryId: plastic.subcategories[0]!.id,
      estimatedQuantity: '20 kg',
      description: 'Garrafas PET limpas',
      ...SAMPLE_LOCATION,
      ...overrides,
    })
  return res
}

let counter = 0

// Cadastra um usuário. Por padrão já com o e-mail confirmado, para os testes que não
// tratam da confirmação poderem informar e coletar; use { verified: false } para testá-la.
export async function registerUser(
  overrides: Partial<Record<string, string>> = {},
  { verified = true }: { verified?: boolean } = {},
) {
  counter += 1
  const body = {
    name: `Usuário ${counter}`,
    email: `usuario${counter}@teste.com`,
    password: 'senha-segura-123',
    ...overrides,
  }
  const res = await request(app).post('/api/auth/register').send(body)
  if (verified && res.status === 201) {
    await prisma.user.update({
      where: { id: res.body.user.id },
      data: { emailVerifiedAt: new Date() },
    })
  }
  return { res, body, token: res.body.token as string }
}
