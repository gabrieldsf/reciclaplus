# Recicla+

Web App responsiva e mobile-first para identificação, disponibilização e coleta de materiais
recicláveis. Projeto de TCC: a especificação completa está no "Plano Completo de Projeto" (PDF).

## Stack

- `web/`: React + TypeScript + Vite, Tailwind CSS v4, Leaflet + OpenStreetMap, PWA (Vite PWA)
- `api/`: Node.js + TypeScript, Express 5, Prisma 7 (adapter `pg`), PostgreSQL (Neon), JWT, Zod
- Testes: Vitest + Supertest (API e regras de negócio), Cypress (E2E)
- Lint: oxlint · Formatação: Prettier · Monorepo com npm workspaces

## Comandos

- `npm install` na raiz (também gera o cliente Prisma)
- `npm run dev:api` / `npm run dev:web` (o Vite encaminha `/api` para `localhost:3333`)
- `npm test`, `npm run lint`, `npm run format`
- Banco: `npm run db:migrate -w @reciclaplus/api`, `npm run db:seed -w @reciclaplus/api`

## Regras de negócio (validar SEMPRE no backend — RN10)

- RN01 Usuário autenticado pode criar ocorrência.
- RN02 Toda ocorrência tem categoria e localização (latitude/longitude).
- RN03 Nova ocorrência inicia como AVAILABLE.
- RN04 Somente ocorrências AVAILABLE podem ser assumidas.
- RN05 Ao assumir → IN_COLLECTION.
- RN06 Somente quem assumiu pode finalizar.
- RN07 Ao finalizar → COLLECTED.
- RN08 COLLECTED não pode ser assumida novamente.
- RN09 Usuário não pode assumir a própria ocorrência.
- Estados: AVAILABLE → IN_COLLECTION → COLLECTED; AVAILABLE/IN_COLLECTION → CANCELLED.
- Concorrência (CT08): assumir uma ocorrência deve ser uma atualização condicional atômica
  (`updateMany where status = AVAILABLE` dentro de transação), nunca "ler e depois gravar".

## Convenções

- Não criar funcionalidades fora do escopo do MVP sem perguntar; não mudar a arquitetura sem justificar.
- Código simples, legível e testável. Interface e mensagens em pt-BR; código em inglês.
- Mobile-first: navegação inferior no celular, lateral/superior no desktop.
- Nunca versionar segredos (`.env`). Usar `api/.env.example` como referência.
- Toda regra de negócio relevante tem teste. Feature só está pronta quando validada (Definition of Done).
- Ao fim de cada alteração: listar arquivos alterados, como testar e possíveis impactos.
