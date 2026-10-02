import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import {
  app,
  auth,
  createOccurrence,
  findCategory,
  registerUser,
  resetDatabase,
  SAMPLE_LOCATION,
} from './helpers.js'

beforeEach(resetDatabase)

describe('POST /api/occurrences', () => {
  it('CT04 — ocorrência válida é criada como AVAILABLE', async () => {
    const { token, res: userRes } = await registerUser()
    const res = await createOccurrence(token)

    expect(res.status).toBe(201)
    expect(res.body.occurrence).toMatchObject({
      status: 'AVAILABLE',
      estimatedQuantity: '20 kg',
      latitude: SAMPLE_LOCATION.latitude,
      longitude: SAMPLE_LOCATION.longitude,
      category: { name: 'Plástico' },
      subcategory: { name: 'Garrafas PET' },
      user: { id: userRes.body.user.id },
    })
    expect(res.body.occurrence.user).not.toHaveProperty('email')
  })

  it('RN03 — ignora status enviado pelo cliente', async () => {
    const { token } = await registerUser()
    const res = await createOccurrence(token, { status: 'COLLECTED' })

    expect(res.status).toBe(201)
    expect(res.body.occurrence.status).toBe('AVAILABLE')
  })

  it('aceita ocorrência só com categoria e localização', async () => {
    const { token } = await registerUser()
    const outros = await findCategory('Outros')
    const res = await request(app)
      .post('/api/occurrences')
      .set(auth(token))
      .send({ categoryId: outros.id, ...SAMPLE_LOCATION })

    expect(res.status).toBe(201)
    expect(res.body.occurrence).toMatchObject({
      subcategory: null,
      description: null,
      estimatedQuantity: null,
    })
  })

  it('CT05 — sem categoria, a validação impede o envio', async () => {
    const { token } = await registerUser()
    const res = await createOccurrence(token, { categoryId: undefined })

    expect(res.status).toBe(400)
    expect(res.body.errors).toContainEqual({
      field: 'categoryId',
      message: 'Categoria é obrigatória',
    })
  })

  it('CT06 — sem localização, a validação impede o envio', async () => {
    const { token } = await registerUser()
    const res = await createOccurrence(token, { latitude: undefined, longitude: undefined })

    expect(res.status).toBe(400)
    const fields = res.body.errors.map((e: { field: string }) => e.field)
    expect(fields).toEqual(expect.arrayContaining(['latitude', 'longitude']))
  })

  it('rejeita coordenadas fora do intervalo válido', async () => {
    const { token } = await registerUser()
    const res = await createOccurrence(token, { latitude: 91, longitude: -181 })

    expect(res.status).toBe(400)
  })

  it('rejeita categoria inexistente', async () => {
    const { token } = await registerUser()
    const res = await createOccurrence(token, { categoryId: 9999, subcategoryId: null })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Categoria inválida')
  })

  it('rejeita subcategoria de outra categoria', async () => {
    const { token } = await registerUser()
    const metal = await findCategory('Metal')
    const res = await createOccurrence(token, { subcategoryId: metal.subcategories[0]!.id })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Subcategoria não pertence à categoria informada')
  })

  it('RN01 — exige usuário autenticado', async () => {
    const res = await request(app).post('/api/occurrences').send({})

    expect(res.status).toBe(401)
  })
})

describe('GET /api/occurrences', () => {
  it('lista apenas ocorrências disponíveis por padrão', async () => {
    const { token } = await registerUser()
    const available = await createOccurrence(token)
    const cancelled = await createOccurrence(token)
    await request(app)
      .post(`/api/occurrences/${cancelled.body.occurrence.id}/cancel`)
      .set(auth(token))

    const res = await request(app).get('/api/occurrences')

    expect(res.status).toBe(200)
    expect(res.body.occurrences.map((o: { id: string }) => o.id)).toEqual([
      available.body.occurrence.id,
    ])
  })

  it('filtra por uma ou mais categorias', async () => {
    const { token } = await registerUser()
    const metal = await findCategory('Metal')
    const vidro = await findCategory('Vidro')
    const papel = await findCategory('Papel / Papelão')
    for (const category of [metal, vidro, papel]) {
      await createOccurrence(token, { categoryId: category.id, subcategoryId: null })
    }

    const res = await request(app).get(`/api/occurrences?categoryId=${metal.id},${vidro.id}`)

    expect(res.status).toBe(200)
    const names = res.body.occurrences.map((o: { category: { name: string } }) => o.category.name)
    expect(names.sort()).toEqual(['Metal', 'Vidro'])
  })

  it('permite consultar outros status explicitamente', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)
    await request(app)
      .post(`/api/occurrences/${created.body.occurrence.id}/cancel`)
      .set(auth(token))

    const res = await request(app).get('/api/occurrences?status=CANCELLED')

    expect(res.body.occurrences).toHaveLength(1)
    expect(res.body.occurrences[0].status).toBe('CANCELLED')
  })

  it('rejeita filtros inválidos', async () => {
    const res = await request(app).get('/api/occurrences?status=QUALQUER&categoryId=abc')

    expect(res.status).toBe(400)
  })
})

describe('GET /api/occurrences/:id', () => {
  it('outro usuário (ou visitante) consegue ver os detalhes', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)

    const res = await request(app).get(`/api/occurrences/${created.body.occurrence.id}`)

    expect(res.status).toBe(200)
    expect(res.body.occurrence).toMatchObject({
      id: created.body.occurrence.id,
      description: 'Garrafas PET limpas',
      status: 'AVAILABLE',
    })
    expect(res.body.occurrence.createdAt).toEqual(expect.any(String))
  })

  it.each(['00000000-0000-4000-8000-000000000000', 'id-invalido'])(
    'responde 404 para id inexistente (%s)',
    async (id) => {
      const res = await request(app).get(`/api/occurrences/${id}`)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Ocorrência não encontrada')
    },
  )
})

describe('PATCH /api/occurrences/:id', () => {
  it('o dono edita uma ocorrência disponível', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)

    const res = await request(app)
      .patch(`/api/occurrences/${created.body.occurrence.id}`)
      .set(auth(token))
      .send({ estimatedQuantity: '35 kg', description: '' })

    expect(res.status).toBe(200)
    expect(res.body.occurrence).toMatchObject({ estimatedQuantity: '35 kg', description: null })
  })

  it('trocar a categoria limpa a subcategoria antiga', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)
    const vidro = await findCategory('Vidro')

    const res = await request(app)
      .patch(`/api/occurrences/${created.body.occurrence.id}`)
      .set(auth(token))
      .send({ categoryId: vidro.id })

    expect(res.status).toBe(200)
    expect(res.body.occurrence).toMatchObject({ category: { name: 'Vidro' }, subcategory: null })
  })

  it('não permite editar ocorrência de outra pessoa', async () => {
    const owner = await registerUser()
    const other = await registerUser()
    const created = await createOccurrence(owner.token)

    const res = await request(app)
      .patch(`/api/occurrences/${created.body.occurrence.id}`)
      .set(auth(other.token))
      .send({ estimatedQuantity: '1 kg' })

    expect(res.status).toBe(403)
  })

  it('não permite editar ocorrência que não está disponível', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)
    await prisma.occurrence.update({
      where: { id: created.body.occurrence.id },
      data: { status: 'IN_COLLECTION' },
    })

    const res = await request(app)
      .patch(`/api/occurrences/${created.body.occurrence.id}`)
      .set(auth(token))
      .send({ estimatedQuantity: '1 kg' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Somente ocorrências disponíveis podem ser editadas')
  })

  it('exige ao menos um campo', async () => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)

    const res = await request(app)
      .patch(`/api/occurrences/${created.body.occurrence.id}`)
      .set(auth(token))
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('POST /api/occurrences/:id/cancel', () => {
  it.each(['AVAILABLE', 'IN_COLLECTION'] as const)(
    'o dono cancela uma ocorrência %s',
    async (status) => {
      const { token } = await registerUser()
      const created = await createOccurrence(token)
      await prisma.occurrence.update({
        where: { id: created.body.occurrence.id },
        data: { status },
      })

      const res = await request(app)
        .post(`/api/occurrences/${created.body.occurrence.id}/cancel`)
        .set(auth(token))

      expect(res.status).toBe(200)
      expect(res.body.occurrence.status).toBe('CANCELLED')
    },
  )

  it.each(['COLLECTED', 'CANCELLED'] as const)('não cancela ocorrência %s', async (status) => {
    const { token } = await registerUser()
    const created = await createOccurrence(token)
    await prisma.occurrence.update({ where: { id: created.body.occurrence.id }, data: { status } })

    const res = await request(app)
      .post(`/api/occurrences/${created.body.occurrence.id}/cancel`)
      .set(auth(token))

    expect(res.status).toBe(409)
  })

  it('não permite cancelar ocorrência de outra pessoa', async () => {
    const owner = await registerUser()
    const other = await registerUser()
    const created = await createOccurrence(owner.token)

    const res = await request(app)
      .post(`/api/occurrences/${created.body.occurrence.id}/cancel`)
      .set(auth(other.token))

    expect(res.status).toBe(403)
    const stored = await prisma.occurrence.findUniqueOrThrow({
      where: { id: created.body.occurrence.id },
    })
    expect(stored.status).toBe('AVAILABLE')
  })
})
