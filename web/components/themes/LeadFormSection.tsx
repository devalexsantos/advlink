"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"

type Props = {
  slug: string
  /** Titles of the site's practice areas (optional select). */
  areas?: string[]
  privacyUrl?: string
  text: string
  borderColor: string
  /** Submit button background / text colors. */
  buttonBg: string
  buttonText: string
  /** Renders the form but blocks submission (previews, unpublished sites). */
  disabled?: boolean
  className?: string
  fieldClassName?: string
}

const MAX_MESSAGE = 1000

export default function LeadFormSection({
  slug,
  areas = [],
  privacyUrl,
  text,
  borderColor,
  buttonBg,
  buttonText,
  disabled = false,
  className = "",
  fieldClassName = "rounded-lg border bg-white/10",
}: Props) {
  const startedAt = useRef<number>(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [area, setArea] = useState("")
  const [message, setMessage] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  const field = `w-full px-3 py-2 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 ${fieldClassName}`
  const fieldStyle = { borderColor, color: text }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (disabled || sending) return
    const form = new FormData(e.currentTarget)
    const honeypot = String(form.get("website") ?? "")
    if (!name.trim()) return setError("Informe seu nome.")
    if (!email.trim() && !phone.trim()) return setError("Informe um e-mail ou um telefone para retorno.")
    if (!message.trim()) return setError("Escreva sua mensagem.")
    if (!consent) return setError("É necessário concordar com o tratamento dos dados para enviar.")
    setError(null)
    setSending(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          area: area || undefined,
          message: message.trim(),
          consent: true,
          website: honeypot,
          startedAt: startedAt.current,
        }),
      })
      if (res.ok) {
        setDone(true)
        return
      }
      const data = await res.json().catch(() => null)
      setError(typeof data?.error === "string" ? data.error : "Não foi possível enviar a mensagem. Tente novamente.")
    } catch {
      setError("Não foi possível enviar a mensagem. Verifique sua conexão e tente novamente.")
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div role="status" className={`mx-auto w-full max-w-2xl rounded-xl border p-6 text-center ${className}`} style={{ color: text, borderColor }}>
        Mensagem enviada. O escritório receberá seu contato.
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`mx-auto w-full max-w-2xl space-y-4 text-left ${className}`} style={{ color: text }}>
      <p className="rounded-lg border px-4 py-3 text-sm opacity-90" style={{ borderColor }}>
        Não envie documentos nem detalhes sensíveis do seu caso por aqui. Use este formulário apenas para um primeiro contato.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`lead-name-${slug}`} className="text-sm font-medium">Nome</label>
          <input id={`lead-name-${slug}`} className={field} style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} required />
        </div>
        <div className="space-y-1">
          <label htmlFor={`lead-email-${slug}`} className="text-sm font-medium">E-mail</label>
          <input id={`lead-email-${slug}`} type="email" className={field} style={fieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`lead-phone-${slug}`} className="text-sm font-medium">Telefone/WhatsApp</label>
          <input id={`lead-phone-${slug}`} type="tel" className={field} style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} />
        </div>
        {areas.length > 0 && (
          <div className="space-y-1">
            <label htmlFor={`lead-area-${slug}`} className="text-sm font-medium">Área (opcional)</label>
            <select id={`lead-area-${slug}`} className={field} style={{ ...fieldStyle, backgroundColor: "rgba(255,255,255,0.1)" }} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="" style={{ color: "#111" }}>Não sei informar</option>
              {areas.map((a) => (
                <option key={a} value={a} style={{ color: "#111" }}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className="-mt-2 text-xs opacity-70">Informe ao menos um e-mail ou telefone para retorno.</p>

      <div className="space-y-1">
        <label htmlFor={`lead-message-${slug}`} className="text-sm font-medium">Mensagem</label>
        <textarea id={`lead-message-${slug}`} rows={5} maxLength={MAX_MESSAGE} className={field} style={fieldStyle} value={message} onChange={(e) => setMessage(e.target.value)} required />
        <p className="text-right text-xs opacity-70" aria-live="off">{message.length}/{MAX_MESSAGE}</p>
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots fill it */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Concordo com o tratamento dos meus dados para retorno deste contato, conforme o{" "}
          {privacyUrl ? (
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">aviso de privacidade</a>
          ) : (
            "aviso de privacidade"
          )}
        </span>
      </label>

      {error && <p role="alert" className="text-sm font-medium" style={{ color: "#ff9b9b" }}>{error}</p>}

      <div className="flex flex-col items-start gap-2">
        <button
          type="submit"
          disabled={disabled || sending}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: buttonBg, color: buttonText }}
        >
          {sending ? "Enviando..." : "Enviar mensagem"}
        </button>
        {disabled && <p className="text-xs opacity-80">Formulário disponível após a publicação do site</p>}
      </div>
    </form>
  )
}
