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

| Comando          | O que faz                             |
| ---------------- | ------------------------------------- |
| `npm test`       | Testes da API (Supertest)¹ e do front |
| `npm run lint`   | Lint (oxlint) em todos os pacotes     |
| `npm run format` | Formata o código com Prettier         |
| `npm run build`  | Build de produção da API e do front   |

¹ Os testes sobem um PostgreSQL temporário e local (`embedded-postgres`), aplicam as migrations e
o descartam ao final. Eles nunca acessam o banco da Neon.

## API

| Método | Rota                            | Auth | Descrição                              |
| ------ | ------------------------------- | ---- | -------------------------------------- |
| GET    | `/api/health`                   | —    | Status da API e do banco               |
| POST   | `/api/auth/register`            | —    | Cadastro (pessoa ou empresa) → `token` |
| POST   | `/api/auth/login`               | —    | Login → `token`                        |
| GET    | `/api/auth/me`                  | JWT  | Usuário autenticado                    |
| GET    | `/api/categories`               | —    | Categorias com subcategorias           |
| GET    | `/api/occurrences`              | —    | Lista (filtros abaixo)                 |
| POST   | `/api/occurrences`              | JWT  | Cria ocorrência (status AVAILABLE)     |
| GET    | `/api/occurrences/:id`          | —    | Detalhes                               |
| PATCH  | `/api/occurrences/:id`          | JWT  | Edita (só o dono, só se AVAILABLE)     |
| POST   | `/api/occurrences/:id/cancel`   | JWT  | Cancela (só o dono)                    |
| POST   | `/api/occurrences/:id/claim`    | JWT  | Assume a coleta (não pode ser o dono)  |
| POST   | `/api/occurrences/:id/complete` | JWT  | Finaliza a coleta (só quem assumiu)    |

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

Filtros de `GET /api/occurrences`: `categoryId=1,2` e `status=AVAILABLE,IN_COLLECTION`
(padrão: `AVAILABLE`).

As respostas de ocorrência incluem `collection`: a coleta mais recente (coletor, datas,
quantidade coletada, observação) ou `null`.

Erros seguem o formato `{ "message": "...", "errors"?: [{ "field", "message" }] }`, com status
400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado) e
409 (status da ocorrência não permite a operação).
