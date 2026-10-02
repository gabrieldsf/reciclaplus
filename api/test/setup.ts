import { afterAll, inject } from 'vitest'

// Precisa rodar antes de qualquer import de src/lib/prisma.ts
process.env['DATABASE_URL'] = inject('databaseUrl')
process.env['JWT_SECRET'] = 'test-secret'

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma.js')
  await prisma.$disconnect()
})
