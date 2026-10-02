import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

// Dono com uma ocorrência disponível + outro usuário (coletor)
async function setup() {
  const owner = await registerUser()
  const collector = await registerUser()
  const created = await createOccurrence(owner.token)
  return { owner, collector, id: created.body.occurrence.id as string }
}

const claim = (id: string, token: string) =>
  request(app).post(`/api/occurrences/${id}/claim`).set(auth(token))

const complete = (id: string, token: string, body: object = {}) =>
  request(app).post(`/api/occurrences/${id}/complete`).set(auth(token)).send(body)

describe('POST /api/occurrences/:id/claim', () => {
  it('CT07 — assumir muda o status para IN_COLLECTION e registra a coleta', async () => {
    const { collector, id } = await setup()

    const res = await claim(id, collector.token)

    expect(res.status).toBe(200)
    expect(res.body.occurrence.status).toBe('IN_COLLECTION')
    expect(res.body.occurrence.collection).toMatchObject({
      collector: { id: collector.res.body.user.id },
      completedAt: null,
      cancelledAt: null,
    })
    expect(res.body.occurrence.collection.collector).not.toHaveProperty('email')
  })

  it('CT08 — vários usuários assumem ao mesmo tempo: apenas um consegue', async () => {
    const { id } = await setup()
    const collectors = await Promise.all(Array.from({ length: 8 }, () => registerUser()))

    const results = await Promise.all(collectors.map((c) => claim(id, c.token)))

    const statuses = results.map((r) => r.status).sort()
    expect(statuses.filter((s) => s === 200)).toHaveLength(1)
    expect(statuses.filter((s) => s === 409)).toHaveLength(collectors.length - 1)
    expect(await prisma.collection.count({ where: { occurrenceId: id } })).toBe(1)
  })

  it('CT09 — usuário não pode assumir a própria ocorrência', async () => {
    const { owner, id } = await setup()

    const res = await claim(id, owner.token)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Você não pode assumir a própria ocorrência')
    const stored = await prisma.occurrence.findUniqueOrThrow({ where: { id } })
    expect(stored.status).toBe('AVAILABLE')
  })

  it('RN04 — ocorrência já em coleta não pode ser assumida por outro', async () => {
    const { collector, id } = await setup()
    const other = await registerUser()
    await claim(id, collector.token)

    const res = await claim(id, other.token)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Esta ocorrência não está mais disponível para coleta')
  })

  it('CT12 — ocorrência já coletada não pode ser assumida novamente', async () => {
    const { collector, id } = await setup()
    const other = await registerUser()
    await claim(id, collector.token)
    await complete(id, collector.token)

    const res = await claim(id, other.token)

    expect(res.status).toBe(409)
  })

  it('ocorrência cancelada não pode ser assumida', async () => {
    const { owner, collector, id } = await setup()
    await request(app).post(`/api/occurrences/${id}/cancel`).set(auth(owner.token))

    const res = await claim(id, collector.token)

    expect(res.status).toBe(409)
  })

  it('exige autenticação', async () => {
    const { id } = await setup()

    expect((await request(app).post(`/api/occurrences/${id}/claim`)).status).toBe(401)
  })

  it('responde 404 para ocorrência inexistente', async () => {
    const { collector } = await setup()

    const res = await claim('00000000-0000-4000-8000-000000000000', collector.token)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/occurrences/:id/complete', () => {
  it('CT10 — o coletor finaliza e o status muda para COLLECTED', async () => {
    const { collector, id } = await setup()
    await claim(id, collector.token)

    const res = await complete(id, collector.token, {
      collectedQuantity: '18 kg',
      observation: 'Retirado na portaria',
    })

    expect(res.status).toBe(200)
    expect(res.body.occurrence.status).toBe('COLLECTED')
    expect(res.body.occurrence.collection).toMatchObject({
      collectedQuantity: '18 kg',
      observation: 'Retirado na portaria',
      completedAt: expect.any(String),
    })
  })

  it('finaliza sem informar quantidade nem observação', async () => {
    const { collector, id } = await setup()
    await claim(id, collector.token)

    const res = await request(app)
      .post(`/api/occurrences/${id}/complete`)
      .set(auth(collector.token))

    expect(res.status).toBe(200)
    expect(res.body.occurrence.status).toBe('COLLECTED')
  })

  it('CT11 — outro usuário não pode finalizar a coleta', async () => {
    const { collector, id } = await setup()
    const intruder = await registerUser()
    await claim(id, collector.token)

    const res = await complete(id, intruder.token)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Somente quem assumiu a coleta pode finalizá-la')
    const stored = await prisma.occurrence.findUniqueOrThrow({ where: { id } })
    expect(stored.status).toBe('IN_COLLECTION')
  })

  it('CT11 — nem o dono da ocorrência pode finalizar a coleta de outro', async () => {
    const { owner, collector, id } = await setup()
    await claim(id, collector.token)

    const res = await complete(id, owner.token)

    expect(res.status).toBe(403)
  })

  it('não finaliza ocorrência que ninguém assumiu', async () => {
    const { collector, id } = await setup()

    const res = await complete(id, collector.token)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Não há coleta em andamento para esta ocorrência')
  })

  it('não finaliza duas vezes', async () => {
    const { collector, id } = await setup()
    await claim(id, collector.token)
    await complete(id, collector.token)

    const res = await complete(id, collector.token)

    expect(res.status).toBe(409)
  })

  it('valida o tamanho dos campos', async () => {
    const { collector, id } = await setup()
    await claim(id, collector.token)

    const res = await complete(id, collector.token, { observation: 'x'.repeat(501) })

    expect(res.status).toBe(400)
  })
})

describe('cancelamento pelo dono durante a coleta', () => {
  it('marca a coleta como cancelada e o coletor não consegue mais finalizar', async () => {
    const { owner, collector, id } = await setup()
    await claim(id, collector.token)

    const cancel = await request(app).post(`/api/occurrences/${id}/cancel`).set(auth(owner.token))

    expect(cancel.status).toBe(200)
    expect(cancel.body.occurrence.status).toBe('CANCELLED')
    expect(cancel.body.occurrence.collection.cancelledAt).toEqual(expect.any(String))

    const res = await complete(id, collector.token)
    expect(res.status).toBe(409)
  })

  it('cancelar e finalizar ao mesmo tempo: só uma das operações vence', async () => {
    const { owner, collector, id } = await setup()
    await claim(id, collector.token)

    const [cancel, done] = await Promise.all([
      request(app).post(`/api/occurrences/${id}/cancel`).set(auth(owner.token)),
      complete(id, collector.token),
    ])

    expect([cancel.status, done.status].sort()).toEqual([200, 409])
    const stored = await prisma.occurrence.findUniqueOrThrow({
      where: { id },
      include: { collections: true },
    })
    const collection = stored.collections[0]!
    // Estado final consistente: ou coletada, ou cancelada — nunca as duas coisas
    if (stored.status === 'COLLECTED') {
      expect(collection.completedAt).not.toBeNull()
      expect(collection.cancelledAt).toBeNull()
    } else {
      expect(stored.status).toBe('CANCELLED')
      expect(collection.cancelledAt).not.toBeNull()
      expect(collection.completedAt).toBeNull()
    }
  })
})
