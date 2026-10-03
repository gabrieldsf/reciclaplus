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

| Comando                             | O que faz                                                 |
| ----------------------------------- | --------------------------------------------------------- |
| `npm test`                          | Testes da API (Supertest)¹ e do front                     |
| `npm run lint`                      | Lint (oxlint) em todos os pacotes                         |
| `npm run format`                    | Formata o código com Prettier                             |
| `npm run build`                     | Build de produção da API e do front                       |
| `npm run icons -w @reciclaplus/web` | Regera os ícones do PWA a partir de `web/public/logo.svg` |

¹ Os testes sobem um PostgreSQL temporário e local (`embedded-postgres`), aplicam as migrations e
o descartam ao final. Eles nunca acessam o banco da Neon.

## API

| Método | Rota                            | Auth | Descrição                                                    |
| ------ | ------------------------------- | ---- | ------------------------------------------------------------ |
| GET    | `/api/health`                   | —    | Status da API e do banco                                     |
| POST   | `/api/auth/register`            | —    | Cadastro (pessoa ou empresa) → `token`                       |
| POST   | `/api/auth/login`               | —    | Login → `token`                                              |
| GET    | `/api/auth/me`                  | JWT  | Usuário autenticado                                          |
| GET    | `/api/categories`               | —    | Categorias com subcategorias                                 |
| GET    | `/api/occurrences`              | —    | Lista (filtros abaixo)                                       |
| POST   | `/api/occurrences`              | JWT  | Cria ocorrência (status AVAILABLE)                           |
| GET    | `/api/occurrences/:id`          | —    | Detalhes                                                     |
| PATCH  | `/api/occurrences/:id`          | JWT  | Edita (só o dono, só se AVAILABLE)                           |
| POST   | `/api/occurrences/:id/cancel`   | JWT  | Cancela (só o dono)                                          |
| POST   | `/api/occurrences/:id/claim`    | JWT  | Assume a coleta (não pode ser o dono)                        |
| POST   | `/api/occurrences/:id/complete` | JWT  | Finaliza a coleta (só quem assumiu)                          |
| GET    | `/api/me/occurrences`           | JWT  | Histórico: ocorrências que registrei                         |
| GET    | `/api/me/collections`           | JWT  | Histórico: coletas que assumi                                |
| GET    | `/api/stats`                    | —    | Painel público: totais, categorias, tempos médios, 8 semanas |

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

Filtros de `GET /api/occurrences`: `categoryId=1,2` e `status=AVAILABLE,IN_COLLECTION`
(padrão: `AVAILABLE`).

As respostas de ocorrência incluem `collection`: a coleta mais recente (coletor, datas,
quantidade coletada, observação) ou `null`.

Erros seguem o formato `{ "message": "...", "errors"?: [{ "field", "message" }] }`, com status
400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado) e
409 (status da ocorrência não permite a operação).

## PWA

O front é um PWA enxuto: pode ser adicionado à tela inicial do celular e abre em tela cheia,
com ícone próprio. O service worker guarda apenas os arquivos do app (HTML, JS, CSS, ícones);
dados da API e mapas sempre vêm da rede. Ele não roda no `npm run dev:web` — para testar, use
o build de produção:

```bash
npm run preview   # build do front + http://localhost:4173 (rode também npm run dev:api)
```

O app mostra um botão **Instalar app** (página inicial e Perfil) quando o navegador permite a
instalação; no iPhone, mostra como instalar pelo menu Compartilhar do Safari.

A instalação exige HTTPS (ou `localhost`); no celular, teste pela URL pública do deploy.

## Testes E2E

Os testes de ponta a ponta (Playwright, desktop + celular) ficam no projeto irmão
[`reciclaplus-playwright`](../reciclaplus-playwright). Eles sobem uma pilha isolada
(Postgres temporário + API + front) e não tocam o banco da Neon:

```bash
cd ../reciclaplus-playwright
npm install && npm run install:browsers
npm test
```
