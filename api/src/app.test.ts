import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('GET /api/health', () => {
  it('responde com o status da API', async () => {
    const res = await request(createApp()).get('/api/health')

    expect([200, 503]).toContain(res.status)
    expect(res.body).toHaveProperty('status')
  })
})
