---
name: release
description: Fluxo de entrega do AdvLink — branch, verificação, commit, PR, CI e deploy no Easypanel seguido de smoke test. Use quando o usuário pedir para commitar, abrir PR, subir para produção ou "fazer deploy".
---

# release

## 1. Branch e verificação
- Nunca commitar direto em `main` com mudanças de código: `git switch -c <tipo>/<descricao-curta>`.
- Rode a skill `verify` (inclusive `npm run build`). Não prossiga com falhas.
- Se houve mudança de schema, confirme que a migration foi gerada pela skill `db-migration`.

## 2. Commit e PR
- Conventional commits em inglês, como o histórico (`feat:`, `fix:`, `chore:`, `test:`), escopo opcional.
- `gh pr create --base main` com resumo, riscos e passos de teste manual. Aguarde o CI (`gh pr checks --watch`).
- Commit/push/merge **somente quando o usuário pedir**.

## 3. Deploy (Easypanel, VPS Docker)
Cada serviço é um app no Easypanel buildado a partir do Dockerfile do subdiretório:
| Serviço | Dockerfile | Domínio | Observações |
|---|---|---|---|
| web | `web/Dockerfile` | app.advlink.site + `*.advlink.site` (wildcard) | roda `prisma migrate deploy` no boot; precisa de todas as env de `web/.env.example` |
| lp | `lp/Dockerfile` | advlink.site | Nginx estático; bump do `?v=` do CSS ao mudar estilos (cache de 1 ano) |
| blog | `blog/Dockerfile` | blog.advlink.site | **volume persistente em `/app/data`** (newsletter) |

O deploy é disparado pelo usuário no Easypanel (ou por auto-deploy no push para `main`, se configurado lá). Não tente acessar a VPS sem ele pedir.

Antes de um deploy com migration: confirme que existe backup recente do Postgres de produção.

## 4. Pós-deploy
Rode a skill `prod-smoke` e reporte. Se algo quebrou, a reversão é redeploy da imagem/commit anterior no Easypanel — migrations não são revertidas automaticamente.
