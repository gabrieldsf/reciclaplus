import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './helpers.js'

describe('GET /api/health', () => {
  it('confirma que a API e o banco estão no ar', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', database: 'ok' })
  })

  it('responde 404 em JSON para rotas inexistentes', async () => {
    const res = await request(app).get('/api/nao-existe')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Rota não encontrada')
  })
})
