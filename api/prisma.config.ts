import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // A CLI (migrations) usa a conexão direta; a aplicação usa a conexão com pooling (DATABASE_URL)
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
})
