export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { generateAreaFaqs } from "@/lib/openai"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"

const bodySchema = z.object({ areaId: z.string().min(1) })

/** Suggests an informative FAQ for one practice area of the active site. Saves nothing. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Área inválida." }, { status: 400 })

  const area = await prisma.activityAreas.findUnique({
    where: { id: parsed.data.areaId },
    select: { profileId: true, title: true },
  })
  if (!area) return NextResponse.json({ error: "Área não encontrada." }, { status: 404 })
  if (area.profileId !== profileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const apiKey = process.env.OPENAI_API_KEY ?? ""
  if (!apiKey) {
    return NextResponse.json({ error: "Geração com IA indisponível no momento." }, { status: 503 })
  }

  // Counted only for valid requests that will actually reach OpenAI (shared with descriptions).
  const limit = rateLimiters.aiDescriptionByUser.check(userId)
  if (!limit.ok) {
    return rateLimitResponse(limit, { error: "Limite de gerações com IA atingido. Tente novamente mais tarde." })
  }

  try {
    const faqs = await generateAreaFaqs(area.title, apiKey)
    return NextResponse.json({ faqs })
  } catch (e) {
    console.error("[generate-faq] OpenAI failed", e)
    return NextResponse.json({ error: "Não foi possível gerar as perguntas agora. Tente novamente." }, { status: 502 })
  }
}
