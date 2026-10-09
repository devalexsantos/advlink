---
name: api-route
description: Padrão para criar ou alterar API routes autenticadas do AdvLink (web/app/api/**) com sessão, site ativo multi-site, validação zod, escopo por profileId e teste Vitest. Use ao criar endpoint novo ou refatorar um existente.
---

# api-route

Referência viva: `web/app/api/links/route.ts` e `web/app/api/links/__tests__/route.test.ts`.

## Esqueleto (rota de usuário)
```ts
export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"

const bodySchema = z.object({ /* ... */ })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  // toda leitura/escrita filtrada por profileId (ownership!)
}
```

## Regras
- **Ownership**: update/delete por id sempre com `where: { id, profileId }` ou checagem prévia (`findFirst`) — senão é IDOR.
- Rotas admin usam `getAdminSession()` de `@/lib/admin-auth` e registram `AuditLog` via `@/lib/audit-log` para ações que mudam dados.
- Upload: validar MIME (allow-list de imagens) e tamanho antes de `uploadToS3`.
- HTML/rich text vindo do usuário deve ser sanitizado antes de ser renderizado.
- Eventos de produto relevantes: `trackEvent` de `@/lib/product-events` (fire-and-forget).

## Teste obrigatório (`__tests__/route.test.ts`)
`// @vitest-environment node`, mocks com `vi.hoisted()` para `next-auth`, `@/auth`, `@/lib/prisma`, `@/lib/active-site`; casos mínimos: 401 sem sessão, 404 sem site, 400 body inválido, sucesso, e 403/404 para recurso de outro profile.
