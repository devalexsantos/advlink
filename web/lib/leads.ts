import { z } from "zod"
import { toPlainText } from "@/lib/plain-text"

/** Contact-form messages are kept for this long, then purged by the maintenance cron (LGPD). */
export const LEAD_RETENTION_DAYS = 90

/** Minimum time between rendering the form and submitting it; faster submissions are bots. */
export const LEAD_MIN_FILL_MS = 3000

const optionalText = (max: number, message: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? toPlainText(v) : ""))
    .refine((v) => v.length <= max, { message })
    .transform((v) => v || null)

/** Public contact form payload (POST /api/leads). Error messages are shown to the visitor. */
export const leadSchema = z
  .object({
    slug: z.string().min(1).max(100),
    name: z
      .string({ message: "Informe seu nome." })
      .transform((v) => toPlainText(v))
      .refine((v) => v.length >= 2 && v.length <= 100, { message: "Informe seu nome (2 a 100 caracteres)." }),
    email: optionalText(254, "E-mail inválido.").refine((v) => v === null || z.email().safeParse(v).success, {
      message: "E-mail inválido.",
    }),
    phone: optionalText(30, "Telefone inválido.").refine(
      (v) => {
        if (v === null) return true
        const digits = v.replace(/\D/g, "").length
        return digits >= 8 && digits <= 20
      },
      { message: "Telefone inválido." },
    ),
    area: optionalText(120, "Assunto muito longo (máximo de 120 caracteres)."),
    message: z
      .string({ message: "Escreva sua mensagem." })
      .transform((v) => toPlainText(v, { multiline: true }))
      .refine((v) => v.length >= 10 && v.length <= 1000, { message: "A mensagem deve ter entre 10 e 1000 caracteres." }),
    consent: z.literal(true, { message: "É preciso concordar com o uso dos dados para enviar a mensagem." }),
  })
  .refine((d) => d.email !== null || d.phone !== null, {
    message: "Informe um e-mail ou telefone para retorno.",
    path: ["email"],
  })

export type LeadInput = z.infer<typeof leadSchema>
