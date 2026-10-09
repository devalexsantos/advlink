---
name: dev-env
description: Sobe e diagnostica o ambiente local do AdvLink (Postgres via docker compose, .env, migrations, admin seed, dev server, teste de subdomínios). Use quando o usuário quiser rodar o projeto localmente ou quando algo "não sobe".
---

# dev-env

1. **Banco**: `docker compose up -d postgres` na raiz (Postgres 16, user/senha/db `advlink`, porta 5432).
2. **Env**: compare `web/.env` (ou `.env.local`) com `web/.env.example`:
   ```bash
   cd web
   comm -13 <(grep -oE '^[A-Z_]+' .env | sort -u) <(grep -oE '^[A-Z_]+' .env.example | sort -u)
   ```
   Liste as faltantes. `DATABASE_URL` local: `postgresql://advlink:advlink@localhost:5432/advlink`. Nunca imprima valores de segredos.
3. **Schema**: `npx prisma migrate dev` (aplica migrations; nunca `db push` se for compartilhar o banco) e `npx prisma generate`.
4. **Admin**: `npx tsx prisma/seed-admin.ts` cria `admin@example.com` / `admin` (super_admin) — só local.
5. **Rodar**: `npm run dev` → http://localhost:3000.
6. **Subdomínios**: `web/proxy.ts` compara o header `host` (com porta) com `ROOT_DOMAIN`. Localmente use `ROOT_DOMAIN=localhost:3000` e acesse `http://<slug>.localhost:3000` (Chrome resolve `*.localhost`), ou:
   ```bash
   curl -s -H "Host: <slug>.localhost:3000" http://localhost:3000/ | head
   ```
7. **E-mail magic link**: sem SMTP configurado, o envio vai para `127.0.0.1:1025` — rode um Mailpit (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`) e abra http://localhost:8025.
8. **Stripe**: veja a skill `stripe-local`.

Blog: `cd blog && npm run dev` (porta 3000 também — use `-- -p 3001`). LP: abra `lp/index.html` ou `docker build lp`.
