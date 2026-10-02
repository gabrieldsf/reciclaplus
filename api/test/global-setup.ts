// Sobe um PostgreSQL temporário e local para os testes (nunca usa o banco da Neon)
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'
import type { TestProject } from 'vitest/node'

const DB_NAME = 'reciclaplus_test'

// Pede ao SO uma porta livre, para não colidir com outro Postgres
function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo
      server.close(() => resolve(port))
    })
  })
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}

export default async function setup(project: TestProject) {
  const databaseDir = mkdtempSync(join(tmpdir(), 'reciclaplus-pg-'))
  const port = await getFreePort()
  const pg = new EmbeddedPostgres({
    databaseDir,
    port,
    user: 'postgres',
    password: 'postgres',
    persistent: false,
    onLog: () => {},
  })

  await pg.initialise()
  await pg.start()
  await pg.createDatabase(DB_NAME)

  const databaseUrl = `postgresql://postgres:postgres@localhost:${port}/${DB_NAME}`
  const env = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl }
  execSync('npx prisma migrate deploy', { env, stdio: 'ignore' })
  execSync('npx prisma db seed', { env, stdio: 'ignore' })

  project.provide('databaseUrl', databaseUrl)

  return async () => {
    await pg.stop()
    rmSync(databaseDir, { recursive: true, force: true })
  }
}
