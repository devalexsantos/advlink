import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const stage = searchParams.get("stage") // signup_only | site_created | published
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const perPage = 20

  // Count each stage
  const [signupOnly, siteCreated, published] = await Promise.all([
    // Cadastro feito, mas sem site (sem profile ou onboarding incompleto)
    prisma.user.count({
      where: { profile: null },
    }),
    // Site criado mas não publicado (tem profile, isActive = false)
    prisma.user.count({
      where: {
        profile: { isNot: null },
        isActive: false,
      },
    }),
    // Site publicado (tem profile, isActive = true)
    prisma.user.count({
      where: {
        profile: { isNot: null },
        isActive: true,
      },
    }),
  ])

  // Fetch users for selected stage
  let users: Array<{
    id: string
    name: string | null
    email: string | null
    createdAt: Date
    isActive: boolean
    completed_onboarding: boolean
    profile: { slug: string | null } | null
  }> = []
  let total = 0

  if (stage === "signup_only") {
    total = signupOnly
    users = await prisma.user.findMany({
      where: { profile: null },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        completed_onboarding: true,
        profile: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
  } else if (stage === "site_created") {
    total = siteCreated
    users = await prisma.user.findMany({
      where: {
        profile: { isNot: null },
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        completed_onboarding: true,
        profile: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
  } else if (stage === "published") {
    total = published
    users = await prisma.user.findMany({
      where: {
        profile: { isNot: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        completed_onboarding: true,
        profile: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
  }

  return NextResponse.json({
    funnel: {
      signup_only: signupOnly,
      site_created: siteCreated,
      published,
    },
    users,
    total,
    page,
    perPage,
  })
}
