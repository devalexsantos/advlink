// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getServerSessionMock, generateMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  generateMock: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/openai", () => ({ generateActivityDescriptions: generateMock }))

import { POST } from "@/app/api/activity-areas/generate-description/route"

describe("POST /api/activity-areas/generate-description", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Civil" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing title", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns generated description", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    generateMock.mockResolvedValue(["Descrição de Direito Civil"])
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Direito Civil" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.description).toBe("Descrição de Direito Civil")
  })
})
