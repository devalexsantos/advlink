/** wa.me link for a phone number, with an optional pre-filled message (`?text=`). */
export function buildWhatsAppUrl(number: string, message?: string | null): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`
  const text = message?.trim()
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export const WHATSAPP_MESSAGE_MAX = 200
