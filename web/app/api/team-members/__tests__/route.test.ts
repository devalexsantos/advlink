// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    teamMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fns: Promise<unknown>[]) => Promise.all(fns)),
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/team-avatar.jpg" }),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { POST, PATCH, DELETE } from "@/app/api/team-members/route"

const session = { user: { id: "user-1" } }

const makeMember = (overrides = {}) => ({
  id: "tm-1",
  profileId: "profile-1",
  name: "Dra. Maria",
  description: null,
  phone: null,
  whatsapp: null,
  email: null,
  avatarUrl: null,
  position: 1,
  ...overrides,
})

// ---------------------------------------------------------------------------
// POST /api/team-members
// ---------------------------------------------------------------------------
describe("POST /api/team-members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.teamMember.findFirst.mockResolvedValue({ position: 3 })
    prismaMock.teamMember.create.mockResolvedValue(makeMember({ id: "tm-new", position: 4 }))
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("name", "Dra. Maria")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 404 when no active site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("name", "Dra. Maria")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 when name is empty", async () => {
    const form = new FormData()
    form.append("name", "")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Nome obrigatório")
  })

  it("returns 400 when name is whitespace only", async () => {
    const form = new FormData()
    form.append("name", "   ")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Nome obrigatório")
  })

  it("creates member with position 1 when no existing members", async () => {
    prismaMock.teamMember.findFirst.mockResolvedValue(null)
    prismaMock.teamMember.create.mockResolvedValue(makeMember({ id: "tm-first", position: 1 }))
    const form = new FormData()
    form.append("name", "Dra. Maria")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 1 }) })
    )
  })

  it("creates member with next position after existing members", async () => {
    prismaMock.teamMember.findFirst.mockResolvedValue({ position: 3 })
    prismaMock.teamMember.create.mockResolvedValue(makeMember({ id: "tm-4", position: 4 }))
    const form = new FormData()
    form.append("name", "Dr. Carlos")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 4 }) })
    )
  })

  it("creates member without avatar and does not call S3", async () => {
    const form = new FormData()
    form.append("name", "Dra. Maria")
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).not.toHaveBeenCalled()
    expect(prismaMock.teamMember.update).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.member).toBeDefined()
  })

  it("creates member with avatar, uploads to S3, and updates record", async () => {
    const updatedMember = makeMember({ id: "tm-new", avatarUrl: "https://s3.test/team-avatar.jpg" })
    prismaMock.teamMember.update.mockResolvedValue(updatedMember)
    const form = new FormData()
    form.append("name", "Dra. Maria")
    form.append("avatar", new File(["img"], "avatar.jpg", { type: "image/jpeg" }))
    const req = new Request("http://localhost/api/team-members", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalled()
    expect(prismaMock.teamMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { avatarUrl: "https://s3.test/team-avatar.jpg" } })
    )
    const body = await res.json()
    expect(body.member.avatarUrl).toBe("https://s3.test/team-avatar.jpg")
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/team-members
// ---------------------------------------------------------------------------
describe("PATCH /api/team-members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
  })

  // --- JSON reorder ---
  describe("JSON reorder", () => {
    it("reorders members via $transaction", async () => {
      prismaMock.teamMember.findMany.mockResolvedValue([{ id: "tm-1" }, { id: "tm-2" }])
      prismaMock.teamMember.update.mockResolvedValue({})
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: [{ id: "tm-1", position: 2 }, { id: "tm-2", position: 1 }] }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalled()
      const body = await res.json()
      expect(body.ok).toBe(true)
    })

    it("returns 403 for unowned member in order", async () => {
      prismaMock.teamMember.findMany.mockResolvedValue([{ id: "tm-1" }])
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: [{ id: "tm-1", position: 1 }, { id: "tm-999", position: 2 }] }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(403)
    })

    it("returns 400 for invalid JSON body without order array", async () => {
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ foo: "bar" }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Invalid JSON body")
    })
  })

  // --- FormData update ---
  describe("FormData update", () => {
    const existingMember = makeMember({ id: "tm-1", name: "Dra. Maria", description: "Bio", phone: "11999" })

    beforeEach(() => {
      prismaMock.teamMember.findFirst.mockResolvedValue(existingMember)
      prismaMock.teamMember.update.mockResolvedValue({ ...existingMember, name: "Dr. Carlos" })
    })

    it("returns 400 when id is missing", async () => {
      const form = new FormData()
      form.append("name", "Dr. Carlos")
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        body: form,
      })
      const res = await PATCH(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("Missing id")
    })

    it("returns 404 when member not owned by user", async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue(null)
      const form = new FormData()
      form.append("id", "tm-unknown")
      form.append("name", "Dr. Carlos")
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        body: form,
      })
      const res = await PATCH(req)
      expect(res.status).toBe(404)
    })

    it("updates member fields", async () => {
      const updated = { ...existingMember, name: "Dr. Carlos", email: "carlos@test.com" }
      prismaMock.teamMember.update.mockResolvedValue(updated)
      const form = new FormData()
      form.append("id", "tm-1")
      form.append("name", "Dr. Carlos")
      form.append("email", "carlos@test.com")
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        body: form,
      })
      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(prismaMock.teamMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tm-1" },
          data: expect.objectContaining({ name: "Dr. Carlos", email: "carlos@test.com" }),
        })
      )
    })

    it("removes avatar when removeAvatar is true", async () => {
      prismaMock.teamMember.update.mockResolvedValue({ ...existingMember, avatarUrl: null })
      const form = new FormData()
      form.append("id", "tm-1")
      form.append("removeAvatar", "true")
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        body: form,
      })
      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(prismaMock.teamMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avatarUrl: null }),
        })
      )
      expect(uploadToS3Mock).not.toHaveBeenCalled()
    })

    it("uploads new avatar on update", async () => {
      prismaMock.teamMember.update.mockResolvedValue({
        ...existingMember,
        avatarUrl: "https://s3.test/team-avatar.jpg",
      })
      const form = new FormData()
      form.append("id", "tm-1")
      form.append("avatar", new File(["img"], "new-avatar.png", { type: "image/png" }))
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        body: form,
      })
      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(uploadToS3Mock).toHaveBeenCalled()
      expect(prismaMock.teamMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avatarUrl: "https://s3.test/team-avatar.jpg" }),
        })
      )
    })

    it("returns 415 for unsupported content type", async () => {
      const req = new Request("http://localhost/api/team-members", {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "some text",
      })
      const res = await PATCH(req)
      expect(res.status).toBe(415)
      const body = await res.json()
      expect(body.error).toBe("Unsupported content type")
    })
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/team-members
// ---------------------------------------------------------------------------
describe("DELETE /api/team-members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/team-members?id=tm-1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when id is empty", async () => {
    const req = new Request("http://localhost/api/team-members?id=", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 when member not owned by user", async () => {
    prismaMock.teamMember.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/team-members?id=tm-999", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it("deletes member and reindexes remaining positions", async () => {
    prismaMock.teamMember.findFirst.mockResolvedValue(makeMember({ id: "tm-1" }))
    prismaMock.teamMember.delete.mockResolvedValue({})
    prismaMock.teamMember.findMany.mockResolvedValue([
      makeMember({ id: "tm-2", position: 3 }),
      makeMember({ id: "tm-3", position: 5 }),
    ])
    prismaMock.teamMember.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/team-members?id=tm-1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.teamMember.delete).toHaveBeenCalledWith({ where: { id: "tm-1" } })
    expect(prismaMock.$transaction).toHaveBeenCalled()
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("handles empty remaining members after delete", async () => {
    prismaMock.teamMember.findFirst.mockResolvedValue(makeMember({ id: "tm-1" }))
    prismaMock.teamMember.delete.mockResolvedValue({})
    prismaMock.teamMember.findMany.mockResolvedValue([])
    const req = new Request("http://localhost/api/team-members?id=tm-1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.$transaction).toHaveBeenCalledWith([])
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
