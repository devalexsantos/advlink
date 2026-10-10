export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { MAX_FAQS_PER_AREA, MAX_FAQ_ANSWER_LENGTH, MAX_FAQ_QUESTION_LENGTH, toFaqPlainText } from "@/lib/area-faq"

const plainText = z.unknown().transform(toFaqPlainText)

const bodySchema = z.object({
  areaId: z.string({ error: "Área inválida." }).min(1, "Área inválida."),
  faqs: z
    .array(
      z.object({
        question: plainText.pipe(
          z
            .string()
            .min(1, "Preencha a pergunta.")
            .max(MAX_FAQ_QUESTION_LENGTH, `A pergunta deve ter no máximo ${MAX_FAQ_QUESTION_LENGTH} caracteres.`),
        ),
        answer: plainText.pipe(
          z
            .string()
            .min(1, "Preencha a resposta.")
            .max(MAX_FAQ_ANSWER_LENGTH, `A resposta deve ter no máximo ${MAX_FAQ_ANSWER_LENGTH} caracteres.`),
        ),
      }, { error: "Pergunta inválida." }),
      { error: "Lista de perguntas inválida." },
    )
    .max(MAX_FAQS_PER_AREA, `Cada área pode ter no máximo ${MAX_FAQS_PER_AREA} perguntas.`),
}, { error: "Dados inválidos." })

/** Replaces the whole FAQ list of one practice area of the active site. */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }
  const { areaId, faqs } = parsed.data

  const area = await prisma.activityAreas.findUnique({ where: { id: areaId }, select: { profileId: true } })
  if (!area) return NextResponse.json({ error: "Área não encontrada." }, { status: 404 })
  if (area.profileId !== profileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [, created] = await prisma.$transaction([
    prisma.activityAreaFaq.deleteMany({ where: { areaId } }),
    prisma.activityAreaFaq.createManyAndReturn({
      data: faqs.map((f, position) => ({ areaId, question: f.question, answer: f.answer, position })),
      select: { id: true, question: true, answer: true, position: true },
    }),
  ])

  return NextResponse.json({ faqs: [...created].sort((a, b) => a.position - b.position) })
}
