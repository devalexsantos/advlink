import { Resend } from "resend"

let _resend: Resend | null = null

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[Resend] RESEND_API_KEY não configurada — email não será enviado")
    return null
  }
  if (!_resend) {
    _resend = new Resend(key)
  }
  return _resend
}

export const EMAIL_FROM = "AdvLink <no-reply@advlink.site>"
