// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    activityAreas: { findUnique: vi.fn() },
    activityAreaFaq: { deleteMany: vi.fn(), createManyAndReturn: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { PUT } from "@/app/api/activity-areas/faqs/route"

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/activity-areas/faqs", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  )

const faq = (i = 0) => ({ question: `Pergunta ${i}?`, answer: `Resposta informativa ${i}.` })

describe("PUT /api/activity-areas/faqs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.activityAreas.findUnique.mockResolvedValue({ profileId: "profile-1" })
    prismaMock.activityAreaFaq.deleteMany.mockResolvedValue({ count: 1 })
    prismaMock.activityAreaFaq.createManyAndReturn.mockImplementation(
      ({ data }: { data: { question: string; answer: string; position: number }[] }) =>
        Promise.resolve(data.map((d, i) => ({ id: `f${i}`, question: d.question, answer: d.answer, position: d.position })).reverse()),
    )
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await put({ areaId: "a1", faqs: [] })).status).toBe(401)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("returns 404 without an active site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await put({ areaId: "a1", faqs: [] })).status).toBe(404)
  })

  it.each([
    ["invalid JSON", "{not json", /Dados inválidos/],
    ["missing areaId", { faqs: [] }, /Área inválida/],
    ["faqs not an array", { areaId: "a1", faqs: "x" }, /Lista de perguntas/],
    ["empty question", { areaId: "a1", faqs: [{ question: "   ", answer: "ok" }] }, /Preencha a pergunta/],
    ["empty answer after stripping HTML", { areaId: "a1", faqs: [{ question: "ok?", answer: "<p> </p>" }] }, /Preencha a resposta/],
    ["question over 150 chars", { areaId: "a1", faqs: [{ question: "a".repeat(151), answer: "ok" }] }, /150/],
    ["answer over 700 chars", { areaId: "a1", faqs: [{ question: "ok?", answer: "a".repeat(701) }] }, /700/],
  ])("returns 400 for %s", async (_label, body, message) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(message)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("returns 400 above 8 FAQs", async () => {
    const res = await put({ areaId: "a1", faqs: Array.from({ length: 9 }, (_, i) => faq(i)) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/no máximo 8/)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("accepts exactly 8 FAQs", async () => {
    const res = await put({ areaId: "a1", faqs: Array.from({ length: 8 }, (_, i) => faq(i)) })
    expect(res.status).toBe(200)
    expect((await res.json()).faqs).toHaveLength(8)
  })

  it("returns 404 when the area does not exist", async () => {
    prismaMock.activityAreas.findUnique.mockResolvedValue(null)
    expect((await put({ areaId: "missing", faqs: [faq()] })).status).toBe(404)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("returns 403 for an area of another site", async () => {
    prismaMock.activityAreas.findUnique.mockResolvedValue({ profileId: "profile-2" })
    expect((await put({ areaId: "a-other", faqs: [faq()] })).status).toBe(403)
    expect(prismaMock.activityAreaFaq.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.activityAreaFaq.createManyAndReturn).not.toHaveBeenCalled()
  })

  it("replaces the list in a transaction with positions 0..n-1, stripping HTML", async () => {
    const res = await put({
      areaId: "a1",
      faqs: [
        { question: "  <b>O que é inventário?</b> ", answer: "<p>É o procedimento <script>x</script>de partilha.</p>" },
        faq(1),
      ],
    })
    expect(res.status).toBe(200)
    expect(prismaMock.activityAreas.findUnique).toHaveBeenCalledWith({ where: { id: "a1" }, select: { profileId: true } })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.activityAreaFaq.deleteMany).toHaveBeenCalledWith({ where: { areaId: "a1" } })
    expect(prismaMock.activityAreaFaq.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { areaId: "a1", question: "O que é inventário?", answer: "É o procedimento xde partilha.", position: 0 },
        { areaId: "a1", question: "Pergunta 1?", answer: "Resposta informativa 1.", position: 1 },
      ],
      select: { id: true, question: true, answer: true, position: true },
    })
    const data = await res.json()
    expect(data.faqs.map((f: { position: number }) => f.position)).toEqual([0, 1])
    expect(data.faqs[0]).toEqual({ id: "f0", question: "O que é inventário?", answer: "É o procedimento xde partilha.", position: 0 })
  })

  it("clears the list with an empty array", async () => {
    const res = await put({ areaId: "a1", faqs: [] })
    expect(res.status).toBe(200)
    expect(prismaMock.activityAreaFaq.deleteMany).toHaveBeenCalledWith({ where: { areaId: "a1" } })
    expect((await res.json()).faqs).toEqual([])
  })
})
