// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({ prismaMock: { user: { updateMany: vi.fn() } } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET, POST } from "../route"
import { signUnsubscribeToken } from "@/lib/emails/unsubscribe-token"

const url = (token?: string) => `https://app.advlink.site/api/emails/unsubscribe${token ? `?token=${token}` : ""}`

describe("/api/emails/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EMAIL_UNSUBSCRIBE_SECRET = "s".repeat(40)
    process.env.NEXT_PUBLIC_APP_ORIGIN = "https://app.advlink.site"
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 })
  })
  afterEach(() => {
    delete process.env.EMAIL_UNSUBSCRIBE_SECRET
    delete process.env.NEXT_PUBLIC_APP_ORIGIN
  })

  it("GET with valid token records the opt-out and redirects", async () => {
    const token = (await signUnsubscribeToken("u1"))!
    const res = await GET(new Request(url(token)))
    expect(res.status).toBe(303)
    expect(res.headers.get("location")).toBe("https://app.advlink.site/descadastro")
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1", marketingEmailsOptOutAt: null } }),
    )
  })

  it("GET with invalid token redirects to the error page without writing", async () => {
    const res = await GET(new Request(url("garbage")))
    expect(res.headers.get("location")).toBe("https://app.advlink.site/descadastro?erro=1")
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled()
  })

  it("POST (one-click) opts out with 200, and 400 for an invalid token", async () => {
    const token = (await signUnsubscribeToken("u1"))!
    const ok = await POST(new Request(url(token), { method: "POST", body: "List-Unsubscribe=One-Click" }))
    expect(ok.status).toBe(200)
    const bad = await POST(new Request(url("nope"), { method: "POST" }))
    expect(bad.status).toBe(400)
  })
})
