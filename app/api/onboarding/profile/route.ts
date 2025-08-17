export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateActivityDescriptions } from "@/lib/openai"
import { uploadToS3 } from "@/lib/s3"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const contentType = req.headers.get("content-type") || ""
    let displayName = ""
    let areas: string[] = []
    let about: string | undefined
    let email = ""
    let phone: string | undefined
    let cellphone: string | undefined
    let whatsapp: string | undefined
    let avatarFile: File | undefined

    if (contentType.includes("application/json")) {
      const body = await req.json()
      displayName = body.displayName
      areas = body.areas ?? []
      about = body.about
      email = body.email
      phone = body.phone
      cellphone = body.cellphone
      whatsapp = body.whatsapp
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      displayName = String(form.get("displayName") ?? "")
      areas = JSON.parse(String(form.get("areas") ?? "[]"))
      about = String(form.get("about") ?? "") || undefined
      email = String(form.get("email") ?? "")
      phone = String(form.get("phone") ?? "") || undefined
      cellphone = String(form.get("cellphone") ?? "") || undefined
      whatsapp = String(form.get("whatsapp") ?? "") || undefined
      const f = form.get("photo")
      if (f && f instanceof File) avatarFile = f
    }

    // userId garantido acima

    // 1) Gera descrições com OpenAI
    const titles = Array.from(new Set(areas ?? [])).filter(Boolean)
    const openaiKey = process.env.OPENAI_API_KEY ?? ""
    const descriptions = titles.length ? await generateActivityDescriptions(titles, openaiKey) : []

    // 2) Upsert do Profile (sem avatarUrl)
    // Upload opcional de avatar
    let avatarUrl: string | null = null
    if (avatarFile) {
      const arrayBuffer = await avatarFile.arrayBuffer()
      const ext = avatarFile.type.split("/")[1] || "jpg"
      const key = `avatars/${userId}.${Date.now()}.${ext}`
      const uploaded = await uploadToS3({
        key,
        contentType: avatarFile.type || "image/jpeg",
        body: Buffer.from(arrayBuffer),
        cacheControl: "public, max-age=604800, immutable",
      })
      avatarUrl = uploaded.url
    }

    // 2b) Gera slug único baseado no displayName
    async function slugifyUnique(name: string): Promise<string> {
      const base = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 50)
      let slug = base || 'user'
      let suffix = 0
      while (true) {
        const exists = await prisma.profile.findFirst({ where: { slug, NOT: { userId } }, select: { id: true } })
        if (!exists) return slug
        suffix++
        const rand = Math.random().toString(36).slice(2, 5)
        slug = `${base}-${suffix}-${rand}`.slice(0, 60)
      }
    }
    const slug = await slugifyUnique(displayName)

    await prisma.profile.upsert({
      where: { userId },
      update: {
        publicName: displayName,
        aboutDescription: about ?? null,
        publicEmail: email,
        publicPhone: phone ?? null,
        whatsapp: whatsapp ?? cellphone ?? null,
        avatarUrl: avatarUrl ?? undefined,
        slug,
      },
      create: {
        userId,
        publicName: displayName,
        aboutDescription: about ?? null,
        publicEmail: email,
        publicPhone: phone ?? null,
        whatsapp: whatsapp ?? cellphone ?? null,
        avatarUrl: avatarUrl ?? undefined,
        slug,
      },
    })

    // 3) Sincroniza ActivityAreas (simples: deleta e recria)
    await prisma.activityAreas.deleteMany({ where: { userId } })
    if (titles.length) {
      const data = titles.map((title, i) => ({
        userId,
        title,
        description: descriptions[i] ? descriptions[i].slice(0, 2000) : null,
        position: i + 1,
      }))
      await prisma.activityAreas.createMany({ data })
    }

    // 4) Marca onboarding como concluído
    await prisma.user.update({
      where: { id: userId },
      data: { completed_onboarding: true },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message || 'Internal error') : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


