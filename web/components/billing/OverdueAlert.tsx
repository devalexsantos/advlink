"use client"

import { AlertTriangle } from "lucide-react"
import { formatCivilDate, useBillingStatus } from "./useBillingStatus"

/** Published site with a late payment (grace period): pay before it goes offline (BIL-5). */
export default function OverdueAlert() {
  const { data } = useBillingStatus()
  if (data?.billingStatus !== "GRACE") return null
  const invoiceUrl = data.pendingPayment?.invoiceUrl
  return (
    <div role="alert" className="w-full max-w-4xl mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-900 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
      <div className="space-y-1">
        <p className="font-semibold">Pagamento em atraso.</p>
        <p>
          Seu site continua no ar até {formatCivilDate(data.graceUntil)}. Depois disso, ele sai do ar até o pagamento ser feito.
        </p>
        {invoiceUrl && (
          <a href={invoiceUrl} target="_blank" rel="noreferrer" className="inline-block font-semibold underline underline-offset-4">
            Pagar agora
          </a>
        )}
      </div>
    </div>
  )
}
