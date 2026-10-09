---
name: verify
description: Gate de qualidade do AdvLink — roda lint, typecheck, testes e build de web/ (e opcionalmente blog/). Use antes de commit, PR ou ao declarar uma tarefa concluída, e quando o usuário pedir "verifica", "roda os testes", "está tudo ok?".
---

# verify

Execute em ordem, parando no primeiro passo que falhar e reportando a saída relevante (não resuma erros a ponto de esconder a causa).

```bash
cd web
npm run lint
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run build            # opcional se só mudou testes/docs; obrigatório antes de release
```

Se a mudança tocou `blog/`:
```bash
cd blog && npm run lint && npm run build
```

Se tocou `lp/`: valide que o HTML abre sem erro de console e que links/assets referenciados existem (`grep -o 'href="[^"]*"' lp/index.html`).

## Regras
- **Dívida conhecida (2026-10-09):** `lint` tinha 53 erros e `typecheck` ~17 (a maioria em testes) antes de qualquer mudança; os testes estavam 100% verdes (106 arquivos / 1495 testes). Até a dívida ser zerada, falha = erro novo em arquivo tocado (`git diff --name-only`). Quando zerar, remova esta linha e o `continue-on-error` do CI.
- `npm run build` precisa de `DATABASE_URL` e variáveis do Next; se falhar só por env ausente, diga isso explicitamente em vez de tratar como bug.
- Nunca "conserte" um teste falhando enfraquecendo a asserção sem explicar por que a asserção estava errada.
- Relate o resultado assim: ✅/❌ por etapa + contagem de testes (passou/falhou).
