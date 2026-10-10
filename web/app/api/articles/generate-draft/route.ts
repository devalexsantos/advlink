export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { generateArticleDraft } from "@/lib/openai"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"
import { ARTICLE_TITLE_MAX } from "@/lib/articles"

const bodySchema = z.object({
  title: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= 3 && v.length <= ARTICLE_TITLE_MAX, {
      message: `Informe um título entre 3 e ${ARTICLE_TITLE_MAX} caracteres.`,
    }),
  notes: z.string().max(2000, { message: "As observações devem ter no máximo 2000 caracteres." }).nullish(),
})

/** AI draft (Markdown) for an article. The lawyer must review it before publishing (PATCH requires `reviewed`). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Geração com IA indisponível no momento." }, { status: 503 })

  // Counted only for valid requests that will actually reach OpenAI.
  const limit = rateLimiters.aiDescriptionByUser.check(userId)
  if (!limit.ok) {
    return rateLimitResponse(limit, { error: "Limite de gerações com IA atingido. Tente novamente mais tarde." })
  }

  try {
    const draft = await generateArticleDraft(parsed.data.title, parsed.data.notes, apiKey)
    return NextResponse.json(draft)
  } catch (err) {
    console.error("[articles] falha ao gerar rascunho", err)
    return NextResponse.json({ error: "Não foi possível gerar o rascunho agora. Tente novamente." }, { status: 502 })
  }
}
