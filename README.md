# ♻ Recicla+

Plataforma web responsiva e mobile-first para identificação, disponibilização e coleta de materiais
recicláveis. Trabalho de Conclusão de Curso.

## Estrutura

```
reciclaplus/
├── api/   # Node.js + Express + Prisma (PostgreSQL)
└── web/   # React + Vite + Tailwind (PWA)
```

## Como rodar localmente

Pré-requisitos: Node.js 22+ e um banco PostgreSQL (usamos o Neon, plano gratuito).

```bash
npm install
cp api/.env.example api/.env       # preencha DATABASE_URL, DIRECT_URL e JWT_SECRET
npm run db:migrate -w @reciclaplus/api
npm run db:seed -w @reciclaplus/api

npm run dev:api   # http://localhost:3333
npm run dev:web   # http://localhost:5173
```

## Scripts úteis

| Comando          | O que faz                           |
| ---------------- | ----------------------------------- |
| `npm test`       | Testes da API (Vitest + Supertest)  |
| `npm run lint`   | Lint (oxlint) em todos os pacotes   |
| `npm run format` | Formata o código com Prettier       |
| `npm run build`  | Build de produção da API e do front |
