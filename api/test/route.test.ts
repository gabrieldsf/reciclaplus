import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setRouteProvider } from '../src/lib/routing.js'
import {
  app,
  auth,
  createOccurrence,
  registerUser,
  resetDatabase,
  SAMPLE_LOCATION,
} from './helpers.js'

beforeEach(resetDatabase)
afterEach(() => setRouteProvider(null))

// Coletor ~1 km ao sul do material
const COLLECTOR_AT = { lat: SAMPLE_LOCATION.latitude - 0.009, lng: SAMPLE_LOCATION.longitude }

async function claimedOccurrence() {
  const owner = await registerUser()
  const collector = await registerUser()
  const created = await createOccurrence(owner.token)
  const id = created.body.occurrence.id as string
  await request(app).post(`/api/occurrences/${id}/claim`).set(auth(collector.token))
  return { owner, collector, id }
}

const getRoute = (id: string, token: string, at = COLLECTOR_AT) =>
  request(app).get(`/api/occurrences/${id}/route`).query(at).set(auth(token))

describe('GET /api/occurrences/:id/route', () => {
  it('sem serviço de rotas configurado, devolve linha reta até o material', async () => {
    const { collector, id } = await claimedOccurrence()

    const res = await getRoute(id, collector.token)

    expect(res.status).toBe(200)
    expect(res.body.route.source).toBe('straight')
    expect(res.body.route.path).toEqual([
      { latitude: COLLECTOR_AT.lat, longitude: COLLECTOR_AT.lng },
      SAMPLE_LOCATION,
    ])
    // ~1 km
    expect(res.body.route.distanceMeters).toBeGreaterThan(950)
    expect(res.body.route.distanceMeters).toBeLessThan(1050)
  })

  it('com o serviço de rotas, devolve o caminho pelas ruas', async () => {
    const { collector, id } = await claimedOccurrence()
    const streets = [
      { latitude: COLLECTOR_AT.lat, longitude: COLLECTOR_AT.lng },
      { latitude: COLLECTOR_AT.lat, longitude: COLLECTOR_AT.lng + 0.002 },
      SAMPLE_LOCATION,
    ]
    setRouteProvider(async () => ({ path: streets, distanceMeters: 1234 }))

    const res = await getRoute(id, collector.token)

    expect(res.body.route).toEqual({ path: streets, distanceMeters: 1234, source: 'streets' })
  })

  it('se o serviço de rotas falhar, cai para a linha reta', async () => {
    const { collector, id } = await claimedOccurrence()
    setRouteProvider(async () => {
      throw new Error('fora do ar')
    })

    const res = await getRoute(id, collector.token)

    expect(res.status).toBe(200)
    expect(res.body.route.source).toBe('straight')
  })

  it('só quem assumiu a coleta vê a rota (nem o dono)', async () => {
    const { owner, id } = await claimedOccurrence()
    const stranger = await registerUser()

    expect((await getRoute(id, owner.token)).status).toBe(403)
    expect((await getRoute(id, stranger.token)).status).toBe(403)
  })

  it('não existe rota para ocorrência que não está em coleta', async () => {
    const owner = await registerUser()
    const other = await registerUser()
    const created = await createOccurrence(owner.token)

    const res = await getRoute(created.body.occurrence.id, other.token)

    expect(res.status).toBe(409)
  })

  it('depois de finalizar, a rota deixa de existir', async () => {
    const { collector, id } = await claimedOccurrence()
    await request(app).post(`/api/occurrences/${id}/complete`).set(auth(collector.token))

    expect((await getRoute(id, collector.token)).status).toBe(409)
  })

  it('valida a posição informada e exige login', async () => {
    const { collector, id } = await claimedOccurrence()

    expect((await getRoute(id, collector.token, { lat: 999, lng: 0 })).status).toBe(400)
    expect(
      (await request(app).get(`/api/occurrences/${id}/route`).query(COLLECTOR_AT)).status,
    ).toBe(401)
  })
})
