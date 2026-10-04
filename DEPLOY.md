# Deploy do Recicla+

- **Front (PWA):** https://reciclaplus.vercel.app
- **API:** https://reciclaplus-api.onrender.com/api/health

```
Usuário ──HTTPS──► Vercel (front + PWA) ──/api/*──► Render (API Node) ──► Neon (PostgreSQL)
```

- O front chama sempre `/api/...` no **mesmo domínio**; a Vercel repassa essas chamadas para o
  Render (`rewrites` em [web/vercel.json](web/vercel.json)). Assim não há CORS e o PWA funciona
  com uma única URL.
- A API aplica as migrations pendentes e garante as categorias a cada deploy
  ([render.yaml](render.yaml)).
- A cada `git push` na `main`: o GitHub Actions roda os testes ([ci.yml](.github/workflows/ci.yml)),
  e Render e Vercel publicam a nova versão automaticamente.

## 1. API no Render

1. Render → **New → Blueprint** → conecte o repositório `gabrieldsf/reciclaplus`.
2. O Render lê o `render.yaml` e cria o serviço `reciclaplus-api`. Preencha as variáveis:
   - `DATABASE_URL`: string da Neon **com** pooling (host com `-pooler`), `sslmode=verify-full`
   - `DIRECT_URL`: string da Neon **sem** pooling
   - `CORS_ORIGIN`: URL do front na Vercel (pode preencher depois do passo 2)
   - `JWT_SECRET` é gerado automaticamente.
   - `BREVO_API_KEY` e `EMAIL_FROM`: chave da API da Brevo e o remetente verificado nela
     (envio do código de confirmação de e-mail). Na Brevo, desative **Security → Authorized IPs**,
     senão os envios a partir do Render são bloqueados.
3. Aguarde o deploy e teste: `https://reciclaplus-api.onrender.com/api/health` →
   `{"status":"ok","database":"ok"}`.

> Se o Render der outro endereço ao serviço, atualize o `destination` em `web/vercel.json`.

## 2. Front na Vercel

1. Vercel → **Add New → Project** → importe `gabrieldsf/reciclaplus`.
2. **Root Directory: `web`** (o resto vem do `vercel.json`: instalação na raiz do monorepo,
   build do Vite, saída `dist`).
3. Deploy. Abra a URL e confira o mapa, o cadastro e o painel.

## Limitações do plano gratuito

- **Render free hiberna** a API após ~15 min sem acesso; a primeira requisição depois disso leva
  ~30–60 s. Antes de uma apresentação, abra o app (ou `/api/health`) alguns minutos antes.
- **Neon free** suspende o banco quando ocioso; a retomada leva cerca de 1 s.
- Limites e políticas dos planos gratuitos podem mudar (Plano de Projeto, seção 14).
