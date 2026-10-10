"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast/ToastProvider"
import { PLANS, REFUND_WINDOW_DAYS, formatBRL, type BillingCycle } from "@/lib/billing/plan"
import { BILLING_STATUS_KEY, useBillingStatus } from "./useBillingStatus"

type Method = "card_boleto"
type CheckoutError = { code?: string; error?: string; invoiceUrl?: string | null }

const CYCLE_OPTIONS: { cycle: BillingCycle; label: string; hint?: string }[] = [
  { cycle: "MONTHLY", label: `Mensal — ${formatBRL(PLANS.MONTHLY.valueCents)}/mês` },
  { cycle: "YEARLY", label: `Anual — ${formatBRL(PLANS.YEARLY.valueCents)}/ano`, hint: "equivale a 2 meses grátis" },
]

/** Stop watching the payment after this long (the lawyer can come back later; the webhook still publishes). */
const WATCH_TIMEOUT_MS = 15 * 60 * 1000

/**
 * "Publicar" checkout: the Asaas hosted page (card, boleto or Pix) opens in a new tab and
 * this component watches the payment until the site is published (UX-3). Errors are shown inline (UX-7).
 */
export default function PublishCheckout({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState<Method | null>(null)
  const [error, setError] = useState<CheckoutError | null>(null)
  const [watching, setWatching] = useState(false)
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY")
  /** Cycle of the attempt that hit PENDING_PAYMENT: "Pagar de outra forma" retries with the same plan */
  const [lastCycle, setLastCycle] = useState<BillingCycle>("MONTHLY")
  const { data: status } = useBillingStatus({ watch: watching })

  useEffect(() => {
    if (!watching || !status?.published) return
    // Reacting to the polled status (external data), not deriving state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatching(false)
    showToast("Pagamento confirmado! Seu site já está publicado.", 6000)
    qc.invalidateQueries({ queryKey: BILLING_STATUS_KEY })
    router.refresh()
  }, [watching, status, qc, router, showToast])

  // Stop polling after a while even if the status requests keep failing
  useEffect(() => {
    if (!watching) return
    const t = setTimeout(() => setWatching(false), WATCH_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [watching])

  async function start(method: Method, chosenCycle: BillingCycle, replacePending = false) {
    setError(null)
    setLoading(method)
    setLastMethod(method)
    setLastCycle(chosenCycle)
    // Open the tab synchronously (inside the click) so popup blockers allow it; navigate it after the API call
    const tab = window.open("about:blank", "_blank")
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, cycle: chosenCycle, replacePending }),
      })
      const data = (await res.json().catch(() => ({}))) as CheckoutError & { url?: string }
      if (!res.ok || !data.url) {
        tab?.close()
        if (data.code === "ALREADY_ACTIVE") {
          router.refresh()
          return
        }
        setError(res.ok ? { error: "Não foi possível abrir o pagamento." } : data)
        return
      }
      if (tab) tab.location.href = data.url
      else window.location.href = data.url
      setWatching(true)
    } catch {
      tab?.close()
      setError({ error: "Não foi possível conectar. Verifique sua internet e tente novamente." })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div
        role="radiogroup"
        aria-label="Plano"
        className="inline-flex w-full sm:w-auto flex-col sm:flex-row rounded-lg border border-border bg-background p-1 gap-1"
      >
        {CYCLE_OPTIONS.map((opt) => {
          const selected = cycle === opt.cycle
          return (
            <button
              key={opt.cycle}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCycle(opt.cycle)}
              disabled={loading !== null}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                selected ? "bg-purple-600 text-white shadow-sm" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.hint && (
                <>
                  {" "}
                  <span className={selected ? "text-white/85" : "text-muted-foreground"}>({opt.hint})</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={() => start("card_boleto", cycle)}
          disabled={loading !== null}
          className="gap-2 cursor-pointer border border-purple-400 bg-purple-600 text-white hover:bg-purple-500"
        >
          {loading === "card_boleto" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Assinar e publicar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Pague com cartão, boleto ou Pix na página segura do Asaas. No cartão, a renovação é automática.
      </p>
      <p className="text-xs text-muted-foreground">
        Garantia de {REFUND_WINDOW_DAYS} dias: desistiu, devolvemos o valor integral.
      </p>

      {watching && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Aguardando a confirmação do pagamento na aba do Asaas. Seu site é publicado automaticamente assim que o
          pagamento for aprovado (boleto pode levar até 3 dias úteis).
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive space-y-2">
          <p>{error.error ?? "Não foi possível abrir o pagamento. Tente novamente."}</p>
          {error.code === "PENDING_PAYMENT" ? (
            <div className="flex flex-wrap gap-2">
              {error.invoiceUrl && (
                <a href={error.invoiceUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
                  Pagar a cobrança em aberto
                </a>
              )}
              {lastMethod && (
                <button type="button" onClick={() => start(lastMethod, lastCycle, true)} className="font-medium underline underline-offset-4 cursor-pointer">
                  Pagar de outra forma
                </button>
              )}
            </div>
          ) : (
            error.code !== "PAYMENT_IN_REVIEW" && (
              <p>
                Se o problema continuar,{" "}
                <Link href="/profile/tickets/new" className="font-medium underline underline-offset-4">
                  fale com o suporte
                </Link>
                .
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}
