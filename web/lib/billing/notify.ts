import type { BillingNotification } from "./sync"

/** E-mails to the lawyer on billing transitions (wired to Resend in the UI/e-mail phase). */
export async function notifyBilling(n: BillingNotification): Promise<void> {
  console.info("[billing] notificação pendente de e-mail", { profileId: n.profileId, notice: n.notice })
}

/** Lawyer + team are told about a cancellation request (wired to Resend in the e-mail phase). */
export async function notifyCancellationRequested(n: { profileId: string; reason: string; activeUntil: string | null }) {
  console.info("[billing] cancelamento solicitado", { profileId: n.profileId, activeUntil: n.activeUntil })
}
