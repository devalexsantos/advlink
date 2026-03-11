import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { generateActivityDescriptions } from "@/lib/openai"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title } = await req.json()
    const t = String(title ?? "").trim()
    if (!t) return NextResponse.json({ error: "Missing title" }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY ?? ""
    const [desc] = await generateActivityDescriptions([t], apiKey)
    return NextResponse.json({ description: desc ?? "" })
  } catch (e: unknown) {
    const message = typeof e === 'object' && e && 'message' in e ? String((e as { message?: string }).message || 'Internal error') : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


