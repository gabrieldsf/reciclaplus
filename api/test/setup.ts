import { afterAll, inject } from 'vitest'
import { setMxResolver } from '../src/lib/email-domain.js'

// Precisa rodar antes de qualquer import de src/lib/prisma.ts
process.env['DATABASE_URL'] = inject('databaseUrl')
process.env['JWT_SECRET'] = 'test-secret'

// DNS falso e previsível: os testes não dependem da internet
export const FAKE_DNS = {
  missing: 'dominio-que-nao-existe.com', // domínio inexistente
  noMail: 'nao-recebe-email.com', // "null MX": declara que não recebe e-mail
  broken: 'dns-instavel.com', // falha temporária do servidor DNS
}

setMxResolver(async (domain) => {
  const fail = (code: string) => Object.assign(new Error(code), { code })
  if (domain === FAKE_DNS.missing) throw fail('ENOTFOUND')
  if (domain === FAKE_DNS.broken) throw fail('ESERVFAIL')
  if (domain === FAKE_DNS.noMail) return [{ exchange: '.', priority: 0 }]
  return [{ exchange: `mx.${domain}`, priority: 10 }]
})

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma.js')
  await prisma.$disconnect()
})
