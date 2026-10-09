---
name: stripe-local
description: Testa o fluxo de assinatura Stripe do AdvLink localmente com Stripe CLI (checkout, webhook, ativação de site, cancelamento). Use ao mexer em billing ou para validar que pagamento → site publicado funciona.
---

# stripe-local

Pré-requisitos: app rodando (skill `dev-env`), Stripe CLI logado (`stripe login` — peça ao usuário para rodar com `! stripe login`), chaves **de teste** no `.env`.

1. Encaminhar webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET` no `.env` local e reinicie o dev server.
2. Fluxo real: logado no app, clique em assinar no editor → cartão `4242 4242 4242 4242`. Falha de pagamento: `4000 0000 0000 0341`.
3. Conferir no banco:
   ```bash
   cd web && npx prisma studio   # ou psql: select slug, "isActive", "stripeSubscriptionId" from "Profile";
   ```
4. Eventos avulsos (sem metadata real, servem para testar robustez):
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   stripe trigger invoice.payment_failed
   ```
5. Reentrega (idempotência): `stripe events resend <evt_id>` e confirme que nada duplica (ProductEvent, e-mails).

Nunca use chaves `sk_live_` aqui. Em produção, o endpoint do webhook no dashboard Stripe precisa ter habilitados exatamente os eventos tratados em `web/app/api/stripe/webhook/route.ts`.
