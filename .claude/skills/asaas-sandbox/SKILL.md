---
name: asaas-sandbox
description: Testa o fluxo de assinatura do AdvLink no sandbox do Asaas (link de pagamento → pagamento → webhook → site publicado, carência, cancelamento). Use ao mexer em billing ou para validar ponta a ponta antes de subir.
---

# asaas-sandbox

Nunca use a chave de produção aqui. Sandbox: `https://api-sandbox.asaas.com/v3`, chave `$aact_hmlg_...` (a `HttpAsaas` recusa chave e URL de ambientes diferentes).

## 1. Ambiente
1. Postgres local (skill `dev-env`) e migrations aplicadas **passando o DATABASE_URL local explicitamente**.
2. `web/.env.local` com: `ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3`, `ASAAS_API_KEY=$aact_hmlg_...`, `ASAAS_WEBHOOK_AUTH_TOKEN=$(openssl rand -hex 32)`, `CRON_SECRET=$(openssl rand -hex 32)`.
3. `npm run dev` em `web/`.

## 2. Webhook até a máquina local
```bash
cloudflared tunnel --url http://localhost:3000     # anote a URL https://<x>.trycloudflare.com
node --env-file=web/.env.local web/scripts/asaas/register-webhook.ts \
  --name advlink-dev --url https://<x>.trycloudflare.com/api/webhooks/asaas
```
(precisa de `ASAAS_WEBHOOK_ALERT_EMAIL` no env). **Ao terminar, remova o webhook `advlink-dev`** no painel do sandbox (ou rode o script apontando para outra URL) — webhook falhando acumula erros e a conta tem limite de 10.

## 3. Fluxo
1. Logue, conclua o onboarding, clique em "Cartão ou boleto" ou "Pix" no banner.
2. Na aba do Asaas: cartão de teste `4444 4444 4444 4444`, CCV `123`, validade futura, CPF de teste válido. O reCAPTCHA bloqueia automação: faça manualmente.
3. Boleto/Pix: confirme pela API do sandbox: `POST /v3/sandbox/payment/{paymentId}/confirm` (id em `BillingPayment.asaasId` ou no painel).
4. Verifique: banner some e o site publica (`Profile.billingStatus=ACTIVE`, `isActive=true`), `WebhookEvent` com `processedAt`, e-mail "Pagamento confirmado".
5. Varredura: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/billing-sweep`.
6. Cancelamento em /profile/account → assinatura DELETED no Asaas, site no ar até `paidUntil`.

## 4. Testes automatizados
```bash
cd web && DATABASE_URL_TEST=postgresql://advlink:advlink@localhost:5432/advlink_test npx vitest run lib/billing app/api/billing
```
(crie o banco `advlink_test` e rode `prisma migrate deploy` nele antes).
