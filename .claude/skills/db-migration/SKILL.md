---
name: db-migration
description: Fluxo seguro para alterar o schema Prisma do AdvLink e gerar migrations versionadas. Use sempre que `web/prisma/schema.prisma` mudar, ao investigar drift entre schema e banco, ou quando o usuário falar em "migration", "mudar o banco", "nova coluna/tabela".
---

# db-migration

Produção aplica `prisma migrate deploy` no boot do container (`web/Dockerfile`). Portanto **toda migration commitada roda em produção no próximo deploy** — trate como código de produção.

## Passos
1. Edite `web/prisma/schema.prisma`.
2. Gere sem aplicar:
   ```bash
   cd web && npx prisma migrate dev --create-only --name <snake_case_descritivo>
   ```
3. **Revise o SQL** em `web/prisma/migrations/<timestamp>_<nome>/migration.sql`:
   - `NOT NULL` em tabela com dados precisa de `DEFAULT` ou backfill em etapas.
   - `DROP COLUMN`/`DROP TABLE`/rename gerado como drop+add = perda de dados → pare e confirme com o usuário.
   - Índices em tabelas grandes (`PageView`, `ProductEvent`) — avalie impacto.
4. Aplique localmente: `npx prisma migrate dev` e `npx prisma generate`.
5. Atualize mocks/testes afetados (`web/test/mocks/prisma.ts`) e rode a skill `verify`.

## Drift
Para checar se migrations e schema batem:
```bash
cd web && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL"
```
(Saída vazia = sem drift. Shadow DB pode ser outro database no Postgres local.)

## Proibido
- `prisma db push` contra qualquer banco que não seja descartável.
- `prisma migrate reset` sem pedido explícito.
- Editar migration já aplicada em produção — crie uma nova.
