"use client"

import Link from "next/link"
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getProfileHost } from "@/lib/site-url"
import { PLAN, formatBRL } from "@/lib/billing/plan"
import PublishCheckout from "@/components/billing/PublishCheckout"
import { formatCivilDate, useBillingStatus } from "@/components/billing/useBillingStatus"
import { fetchProfile } from "./api"
import ChangeSlugButton from "./ChangeSlugButton"
import SharePreviewButton from "./SharePreviewButton"

/** Banner for an unpublished site: publish (checkout), pending payment, or suspended. */
export default function SubscribeCTA() {
  const { data } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })
  const { data: billing } = useBillingStatus()
  const slug = data?.profile?.slug ?? ""
  const status = billing?.billingStatus ?? "NONE"
  const pending = billing?.pendingPayment

  if (billing?.suspendedByAdmin) {
    return (
      <Banner tone="red" icon={<ShieldAlert className="w-6 h-6 text-red-500" />} title="Seu site foi suspenso pela nossa equipe.">
        <p>
          Para entender o motivo e reativá-lo,{" "}
          <Link href="/profile/tickets/new" className="font-medium underline underline-offset-4">
            abra um chamado no suporte
          </Link>
          .
        </p>
      </Banner>
    )
  }

  if (status === "SUSPENDED") {
    return (
      <Banner tone="red" icon={<AlertTriangle className="w-6 h-6 text-red-500" />} title="Seu site está fora do ar por falta de pagamento.">
        <p>Pague a cobrança em aberto e ele volta ao ar automaticamente.</p>
        {pending?.invoiceUrl && (
          <a href={pending.invoiceUrl} target="_blank" rel="noreferrer" className="inline-block font-semibold underline underline-offset-4">
            Pagar fatura de {formatCivilDate(pending.dueDate)}
          </a>
        )}
        <p className="text-xs opacity-80">Prefere outra forma de pagamento?</p>
        <PublishCheckout compact />
      </Banner>
    )
  }

  if (status === "PENDING") {
    return (
      <Banner tone="amber" icon={<Clock className="w-6 h-6 text-amber-500" />} title="Aguardando a confirmação do pagamento.">
        <p>Assim que o pagamento for aprovado, seu site é publicado automaticamente.</p>
        {pending?.invoiceUrl && (
          <a href={pending.invoiceUrl} target="_blank" rel="noreferrer" className="inline-block font-semibold underline underline-offset-4">
            {pending.billingType === "BOLETO" ? "Ver boleto" : "Ver cobrança"} (vence em {formatCivilDate(pending.dueDate)})
          </a>
        )}
        <PublishCheckout compact />
        <SharePreviewButton />
      </Banner>
    )
  }

  return (
    <Banner tone="amber" icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} title="Sua página ainda não está publicada.">
      {slug && (
        <p>
          Seu endereço será <strong className="break-all">{getProfileHost(slug)}</strong>
          <ChangeSlugButton
            effectiveSlug={slug}
            label="Alterar link"
            className="ml-2 h-auto px-1 py-0 cursor-pointer text-amber-900 underline underline-offset-4 bg-transparent hover:bg-transparent shadow-none"
          />
        </p>
      )}
      <p>
        Publique por {formatBRL(PLAN.valueCents)}/mês. Cancele quando quiser.
      </p>
      <PublishCheckout />
      <SharePreviewButton className="pt-1" />
    </Banner>
  )
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: "amber" | "red"
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const colors =
    tone === "red" ? "border-red-500/50 bg-red-500/10 text-red-900" : "border-amber-500/60 bg-amber-500/10 text-amber-800"
  return (
    <div className={`w-full max-w-4xl mb-4 rounded-xl border p-4 md:p-5 ${colors}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="space-y-2 text-sm md:text-base min-w-0">
          <p className="font-semibold">{title}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
