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
} from './helpers.js'

beforeEach(resetDatabase)

const getStats = () => request(app).get('/api/stats')
const post = (path: string, token: string, body: object = {}) =>
  request(app).post(path).set(auth(token)).send(body)

describe('GET /api/stats', () => {
  it('é público e responde zerado sem dados, com todas as categorias e 8 semanas', async () => {
    const res = await getStats()

    expect(res.status).toBe(200)
    expect(res.body.occurrences).toEqual({
      total: 0,
      AVAILABLE: 0,
      IN_COLLECTION: 0,
      COLLECTED: 0,
      CANCELLED: 0,
    })
    expect(res.body.collectionRate).toBeNull()
    expect(res.body.averageHours).toEqual({ untilClaimed: null, untilCollected: null })
    expect(res.body.byCategory).toHaveLength(6)
    expect(res.body.weekly).toHaveLength(8)
    expect(res.body.weekly.every((w: { registered: number }) => w.registered === 0)).toBe(true)
  })

  it('conta ocorrências por status e calcula a taxa de coleta sem as canceladas', async () => {
    const owner = await registerUser()
    const collector = await registerUser({ userType: 'COMPANY' })
    const ids: string[] = []
    for (let i = 0; i < 5; i++) ids.push((await createOccurrence(owner.token)).body.occurrence.id)

    await post(`/api/occurrences/${ids[0]}/claim`, collector.token)
    await post(`/api/occurrences/${ids[0]}/complete`, collector.token)
    await post(`/api/occurrences/${ids[1]}/claim`, collector.token)
    await post(`/api/occurrences/${ids[2]}/cancel`, owner.token)

    const res = await getStats()

    expect(res.body.occurrences).toEqual({
      total: 5,
      AVAILABLE: 2,
      IN_COLLECTION: 1,
      COLLECTED: 1,
      CANCELLED: 1,
    })
    // 1 coletada de 4 não canceladas
    expect(res.body.collectionRate).toBe(0.25)
    expect(res.body.participants).toEqual({ people: 1, companies: 1, collectors: 1 })
  })

  it('agrupa por categoria com total e coletadas', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const metal = await findCategory('Metal')
    const a = await createOccurrence(owner.token, { categoryId: metal.id, subcategoryId: null })
    await createOccurrence(owner.token, { categoryId: metal.id, subcategoryId: null })
    await createOccurrence(owner.token) // Plástico
    await post(`/api/occurrences/${a.body.occurrence.id}/claim`, collector.token)
    await post(`/api/occurrences/${a.body.occurrence.id}/complete`, collector.token)

    const res = await getStats()
    const byName = Object.fromEntries(
      res.body.byCategory.map((c: { name: string; total: number; collected: number }) => [
        c.name,
        { total: c.total, collected: c.collected },
      ]),
    )

    expect(byName['Metal']).toEqual({ total: 2, collected: 1 })
    expect(byName['Plástico']).toEqual({ total: 1, collected: 0 })
    expect(byName['Vidro']).toEqual({ total: 0, collected: 0 })
  })

  it('calcula o tempo médio até assumir e até coletar', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const created = await createOccurrence(owner.token)
    const id = created.body.occurrence.id
    await post(`/api/occurrences/${id}/claim`, collector.token)
    await post(`/api/occurrences/${id}/complete`, collector.token)

    // Datas controladas: registrada há 10h, assumida há 8h, coletada há 4h
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
    await prisma.occurrence.update({ where: { id }, data: { createdAt: hoursAgo(10) } })
    await prisma.collection.updateMany({
      where: { occurrenceId: id },
      data: { acceptedAt: hoursAgo(8), completedAt: hoursAgo(4) },
    })

    const res = await getStats()

    expect(res.body.averageHours).toEqual({ untilClaimed: 2, untilCollected: 6 })
  })

  it('mostra a atividade da semana atual na última posição', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const created = await createOccurrence(owner.token)
    await createOccurrence(owner.token)
    await post(`/api/occurrences/${created.body.occurrence.id}/claim`, collector.token)
    await post(`/api/occurrences/${created.body.occurrence.id}/complete`, collector.token)

    const res = await getStats()
    const weeks = res.body.weekly

    expect(weeks.at(-1)).toMatchObject({ registered: 2, collected: 1 })
    expect(weeks.slice(0, -1).every((w: { registered: number }) => w.registered === 0)).toBe(true)
    // Semanas consecutivas, começando na segunda-feira
    for (const w of weeks) expect(new Date(`${w.weekStart}T12:00:00Z`).getUTCDay()).toBe(1)
  })

  it('não expõe dados pessoais', async () => {
    const owner = await registerUser({ email: 'privado@teste.com' })
    await createOccurrence(owner.token)

    const res = await getStats()

    expect(JSON.stringify(res.body)).not.toContain('privado@teste.com')
    expect(JSON.stringify(res.body)).not.toContain(owner.body.name)
  })
})
