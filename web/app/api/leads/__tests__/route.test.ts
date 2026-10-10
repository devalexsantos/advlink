// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock, sendMock, getResendMock, trackEventMock } = vi.hoisted(() => {
  const sendMock = vi.fn()
  return {
    prismaMock: {
      profile: { findUnique: vi.fn() },
      lead: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
      contactClick: { create: vi.fn() },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    },
    getServerSessionMock: vi.fn(),
    getActiveSiteIdMock: vi.fn(),
    sendMock,
    getResendMock: vi.fn(() => ({ emails: { send: sendMock } })),
    trackEventMock: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
vi.mock("@/lib/resend", () => ({ getResend: getResendMock, EMAIL_FROM: "AdvLink <no-reply@advlink.site>" }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))

import { GET, POST } from "@/app/api/leads/route"
import { resetRateLimiters } from "@/lib/rate-limit"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"

function validBody(over: Record<string, unknown> = {}) {
  return {
    slug: "joao",
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "",
    area: "Direito do Trabalho",
    message: "Gostaria de entender meus direitos após a demissão.",
    consent: true,
    website: "",
    startedAt: Date.now() - 10_000,
    ...over,
  }
}

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA, "x-real-ip": "189.1.2.3", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

const activeProfile = {
  id: "p1",
  userId: "user-1",
  isActive: true,
  leadFormEnabled: true,
  publicName: "João Advocacia",
  user: { email: "joao@adv.br" },
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
    prismaMock.profile.findUnique.mockResolvedValue(activeProfile)
    prismaMock.lead.create.mockResolvedValue({ id: "lead-1" })
    prismaMock.contactClick.create.mockResolvedValue({ id: "cc-1" })
    sendMock.mockResolvedValue({ data: { id: "e1" }, error: null })
  })

  it("saves the lead, counts a form contact, e-mails the owner and returns 201", async () => {
    const res = await POST(makeReq(validBody()))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })

    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "joao" } }))
    const lead = prismaMock.lead.create.mock.calls[0][0].data
    expect(lead).toMatchObject({
      profileId: "p1",
      name: "Maria Silva",
      email: "maria@example.com",
      phone: null,
      areaTitle: "Direito do Trabalho",
    })
    expect(lead.consentAt).toBeInstanceOf(Date)

    const click = prismaMock.contactClick.create.mock.calls[0][0].data
    expect(click).toMatchObject({ profileId: "p1", kind: "form" })
    expect(click.visitorHash).toMatch(/^[0-9a-f]{16}$/)

    expect(sendMock).toHaveBeenCalledTimes(1)
    const mail = sendMock.mock.calls[0][0]
    expect(mail).toMatchObject({ to: "joao@adv.br", subject: "Nova mensagem pelo seu site", replyTo: "maria@example.com" })
    expect(mail.html).toContain("/profile/contatos")
    expect(trackEventMock).toHaveBeenCalledWith("lead_received", { userId: "user-1", siteId: "p1" })
  })

  it("strips HTML tags and escapes the e-mail content", async () => {
    await POST(
      makeReq(validBody({ name: "<b>Maria</b> Silva", message: "<script>alert(1)</script>Olá, preciso de informação & ajuda" })),
    )
    const lead = prismaMock.lead.create.mock.calls[0][0].data
    expect(lead.name).toBe("Maria Silva")
    expect(lead.message).toBe("alert(1)Olá, preciso de informação & ajuda")
    const html: string = sendMock.mock.calls[0][0].html
    expect(html).not.toContain("<script>")
    expect(html).toContain("informação &amp; ajuda")
  })

  it("accepts phone only and omits replyTo", async () => {
    const res = await POST(makeReq(validBody({ email: "", phone: "(11) 99999-0000" })))
    expect(res.status).toBe(201)
    expect(prismaMock.lead.create.mock.calls[0][0].data).toMatchObject({ email: null, phone: "(11) 99999-0000" })
    expect(sendMock.mock.calls[0][0]).not.toHaveProperty("replyTo")
  })

  it("still returns 201 when the e-mail fails", async () => {
    sendMock.mockRejectedValue(new Error("resend down"))
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const res = await POST(makeReq(validBody()))
    expect(res.status).toBe(201)
    expect(prismaMock.lead.create).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it.each([
    ["unknown slug", null],
    ["unpublished site", { ...activeProfile, isActive: false }],
    ["form disabled", { ...activeProfile, leadFormEnabled: false }],
  ])("returns 404 for %s", async (_label, profile) => {
    prismaMock.profile.findUnique.mockResolvedValue(profile)
    const res = await POST(makeReq(validBody()))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBeTruthy()
    expect(prismaMock.lead.create).not.toHaveBeenCalled()
  })

  it.each([
    ["honeypot filled", { website: "http://spam.example" }],
    ["submitted too fast", { startedAt: Date.now() - 500 }],
    ["missing timer", { startedAt: undefined }],
  ])("silently accepts without saving when %s", async (_label, over) => {
    const res = await POST(makeReq(validBody(over)))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(prismaMock.lead.create).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("silently ignores bot user agents", async () => {
    const res = await POST(makeReq(validBody(), { "user-agent": "Googlebot/2.1" }))
    expect(res.status).toBe(200)
    expect(prismaMock.lead.create).not.toHaveBeenCalled()
  })

  it.each([
    ["short name", { name: "A" }],
    ["no contact", { email: "", phone: "" }],
    ["invalid e-mail", { email: "nao-e-email" }],
    ["short phone", { email: "", phone: "1234" }],
    ["short message", { message: "Oi" }],
    ["long message", { message: "a".repeat(1001) }],
    ["long area", { area: "a".repeat(121) }],
    ["no consent", { consent: false }],
    ["consent as string", { consent: "true" }],
  ])("returns 400 for %s", async (_label, over) => {
    const res = await POST(makeReq(validBody(over)))
    expect(res.status).toBe(400)
    expect(typeof (await res.json()).error).toBe("string")
    expect(prismaMock.lead.create).not.toHaveBeenCalled()
  })

  it("returns 400 for a non-JSON body", async () => {
    const res = await POST(makeReq("not json"))
    expect(res.status).toBe(400)
  })

  it("rate limits per IP+slug with a pt-BR 429", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(makeReq(validBody()))).status).toBe(201)
    const res = await POST(makeReq(validBody()))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/Muitas tentativas/)
    expect(res.headers.get("Retry-After")).toBeTruthy()
  })
})

describe("GET /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getActiveSiteIdMock.mockResolvedValue("p1")
    prismaMock.lead.findMany.mockResolvedValue([{ id: "l1", name: "Maria" }])
    prismaMock.lead.count.mockResolvedValue(1)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it("returns 404 without site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(404)
  })

  it("lists the active site's leads newest first with the unread count", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ leads: [{ id: "l1", name: "Maria" }], unread: 1 })
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: "p1" }, orderBy: { createdAt: "desc" } }),
    )
    expect(prismaMock.lead.count).toHaveBeenCalledWith({ where: { profileId: "p1", readAt: null } })
  })
})
