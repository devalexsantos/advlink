import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { generateActivityDescriptions } from "@/lib/openai"
import { MAX_AREA_TITLE_LENGTH } from "@/lib/activity-area-limits"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title } = await req.json()
    const t = String(title ?? "").trim()
    if (!t) return NextResponse.json({ error: "Missing title" }, { status: 400 })
    if (t.length > MAX_AREA_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `O título deve ter no máximo ${MAX_AREA_TITLE_LENGTH} caracteres.` },
        { status: 400 },
      )
    }

    // Counted only for valid requests that will actually reach OpenAI.
    const limit = rateLimiters.aiDescriptionByUser.check(userId)
    if (!limit.ok) {
      return rateLimitResponse(limit, {
        error: "Limite de gerações com IA atingido. Tente novamente mais tarde.",
      })
    }

    const apiKey = process.env.OPENAI_API_KEY ?? ""
    const [desc] = await generateActivityDescriptions([t], apiKey)
    return NextResponse.json({ description: desc ?? "" })
  } catch (e: unknown) {
    const message = typeof e === 'object' && e && 'message' in e ? String((e as { message?: string }).message || 'Internal error') : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
