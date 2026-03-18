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
    // Users with no profiles at all
    prisma.user.count({
      where: { profiles: { none: {} } },
    }),
    // Users that have at least one profile but none active
    prisma.user.count({
      where: {
        profiles: { some: {} },
        NOT: { profiles: { some: { isActive: true } } },
      },
    }),
    // Users that have at least one active profile
    prisma.user.count({
      where: {
        profiles: { some: { isActive: true } },
      },
    }),
  ])

  // Fetch users for selected stage
  type UserResult = {
    id: string
    name: string | null
    email: string | null
    createdAt: Date
    isActive: boolean
    completed_onboarding: boolean
    profiles: { slug: string | null }[]
  }
  let users: UserResult[] = []
  let total = 0

  const userSelect = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    isActive: true,
    completed_onboarding: true,
    profiles: { select: { slug: true } },
  } as const

  if (stage === "signup_only") {
    total = signupOnly
    users = await prisma.user.findMany({
      where: { profiles: { none: {} } },
      select: userSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
  } else if (stage === "site_created") {
    total = siteCreated
    users = await prisma.user.findMany({
      where: {
        profiles: { some: {} },
        NOT: { profiles: { some: { isActive: true } } },
      },
      select: userSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    })
  } else if (stage === "published") {
    total = published
    users = await prisma.user.findMany({
      where: {
        profiles: { some: { isActive: true } },
      },
      select: userSelect,
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
