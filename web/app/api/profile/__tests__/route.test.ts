// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    activityAreas: { findMany: vi.fn() },
    address: { findUnique: vi.fn(), upsert: vi.fn() },
    links: { findMany: vi.fn() },
    gallery: { findMany: vi.fn() },
    customSection: { findMany: vi.fn() },
    teamMember: { findMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/photo.jpg" }),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/reserved-slugs", async (importOriginal) => importOriginal())
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { GET, PATCH } from "@/app/api/profile/route"

const session = { user: { id: "user-1" } }

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findUnique.mockResolvedValue(null)
    prismaMock.activityAreas.findMany.mockResolvedValue([])
    prismaMock.address.findUnique.mockResolvedValue(null)
    prismaMock.links.findMany.mockResolvedValue([])
    prismaMock.gallery.findMany.mockResolvedValue([])
    prismaMock.customSection.findMany.mockResolvedValue([])
    prismaMock.teamMember.findMany.mockResolvedValue([])
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns profile data", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const profile = { id: "p1", publicName: "Test", slug: "test" }
    prismaMock.profile.findUnique.mockResolvedValue(profile)
    prismaMock.activityAreas.findMany.mockResolvedValue([{ id: "a1", title: "Civil" }])

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.profile.publicName).toBe("Test")
    expect(data.areas).toHaveLength(1)
  })

  it("returns null profile when none exists", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const res = await GET()
    const data = await res.json()
    expect(data.profile).toBeNull()
  })
})

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findUnique.mockResolvedValue({ id: "p1", slug: "existing" })
    prismaMock.profile.update.mockResolvedValue({ id: "p1", publicName: "Updated" })
    prismaMock.address.upsert.mockResolvedValue({})
    prismaMock.address.findUnique.mockResolvedValue(null)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("updates profile via JSON", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Updated Name" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalled()
  })

  it("handles sectionOrder update", async () => {
    prismaMock.profile.update.mockResolvedValue({ id: "p1", sectionOrder: ["sobre", "servicos"] })
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionOrder: ["sobre", "servicos"] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalled()
  })

  it("validates and sets slug when provided", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null) // slug not taken
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "João Silva", slug: "joao-silva" }),
    })
    await PATCH(req)
    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.slug).toBe("joao-silva")
  })

  it("appends -adv to reserved slugs", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Admin", slug: "admin" }),
    })
    await PATCH(req)
    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.slug).toContain("admin-adv")
  })

  it("returns 404 when getActiveSiteId returns null", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("No site found")
  })

  it("updates profile via multipart/form-data with basic fields", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("publicName", "Maria Souza")
    form.append("publicEmail", "maria@example.com")
    form.append("publicPhone", "(11) 99999-0000")
    form.append("whatsapp", "(11) 99999-1111")
    form.append("headline", "Advogada")
    form.append("slug", "maria-souza")
    form.append("metaTitle", "Maria Souza - Advogada")
    form.append("metaDescription", "Perfil profissional")
    form.append("keywords", "direito, advocacia")
    form.append("gtmContainerId", "GTM-123ABC")
    form.append("theme", "modern")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicName).toBe("Maria Souza")
    expect(updateCall.data.publicEmail).toBe("maria@example.com")
    expect(updateCall.data.publicPhone).toBe("(11) 99999-0000")
    expect(updateCall.data.whatsapp).toBe("(11) 99999-1111")
    expect(updateCall.data.headline).toBe("Advogada")
    expect(updateCall.data.slug).toBe("maria-souza")
    expect(updateCall.data.metaTitle).toBe("Maria Souza - Advogada")
    expect(updateCall.data.metaDescription).toBe("Perfil profissional")
    expect(updateCall.data.keywords).toBe("direito, advocacia")
    expect(updateCall.data.gtmContainerId).toBe("GTM-123ABC")
    expect(updateCall.data.theme).toBe("modern")
  })

  it("parses publicPhoneIsFixed and whatsappIsFixed from FormData with 'true'/'false'", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("publicPhoneIsFixed", "true")
    form.append("whatsappIsFixed", "false")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBe(true)
    expect(updateCall.data.whatsappIsFixed).toBe(false)
  })

  it("parses publicPhoneIsFixed as false and whatsappIsFixed as true from FormData", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("publicPhoneIsFixed", "false")
    form.append("whatsappIsFixed", "true")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBe(false)
    expect(updateCall.data.whatsappIsFixed).toBe(true)
  })

  it("parses publicPhoneIsFixed and whatsappIsFixed from FormData with '1'/'0'", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("publicPhoneIsFixed", "1")
    form.append("whatsappIsFixed", "0")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBe(true)
    expect(updateCall.data.whatsappIsFixed).toBe(false)
  })

  it("leaves publicPhoneIsFixed/whatsappIsFixed undefined when not provided in FormData", async () => {
    const form = new FormData()
    form.append("publicName", "Test")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBeUndefined()
    expect(updateCall.data.whatsappIsFixed).toBeUndefined()
  })

  it("uploads avatar via FormData photo field", async () => {
    const fileContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const file = new File([fileContent], "avatar.png", { type: "image/png" })
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("photo", file)

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    expect(uploadToS3Mock).toHaveBeenCalledTimes(1)
    const s3Call = uploadToS3Mock.mock.calls[0][0]
    expect(s3Call.key).toMatch(/^avatars\/profile-1\.\d+\.png$/)
    expect(s3Call.contentType).toBe("image/png")
    expect(s3Call.cacheControl).toBe("public, max-age=604800, immutable")

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.avatarUrl).toBe("https://s3.test/photo.jpg")
  })

  it("uploads cover via FormData cover field", async () => {
    const fileContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    const file = new File([fileContent], "cover.jpg", { type: "image/jpeg" })
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("cover", file)

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    expect(uploadToS3Mock).toHaveBeenCalledTimes(1)
    const s3Call = uploadToS3Mock.mock.calls[0][0]
    expect(s3Call.key).toMatch(/^covers\/profile-1\.\d+\.jpeg$/)
    expect(s3Call.contentType).toBe("image/jpeg")

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.coverUrl).toBe("https://s3.test/photo.jpg")
  })

  it("sets avatarUrl to null when removeAvatar is true (JSON)", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", removeAvatar: true }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.avatarUrl).toBeNull()
  })

  it("sets coverUrl to null when removeCover is true (JSON)", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", removeCover: true }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.coverUrl).toBeNull()
  })

  it("sets removeAvatar/removeCover via FormData string 'true'", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("removeAvatar", "true")
    form.append("removeCover", "true")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.avatarUrl).toBeNull()
    expect(updateCall.data.coverUrl).toBeNull()
  })

  it("retries slug on collision with suffix", async () => {
    // First findFirst call: slug taken; second call: available
    prismaMock.profile.findFirst
      .mockResolvedValueOnce({ id: "other-profile" })
      .mockResolvedValueOnce(null)

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test User", slug: "taken-slug" }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    // Should have a suffix like "taken-slug-1-xxxx"
    expect(updateCall.data.slug).toMatch(/^taken-slug-1-[a-z0-9]+$/)
    expect(prismaMock.profile.findFirst).toHaveBeenCalledTimes(2)
  })

  it("returns 400 for invalid Calendly URL", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", calendlyUrl: "https://example.com/invalid" }),
    })
    // validateCalendly throws a NextResponse, so PATCH will throw
    try {
      await PATCH(req)
      // If it doesn't throw, it must have returned 400
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      // The thrown value is a NextResponse
      expect(e).toBeInstanceOf(Response)
      const res = e as Response
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toMatch(/calendlyUrl/)
    }
  })

  it("saves valid Calendly URL", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", calendlyUrl: "https://calendly.com/user/meeting" }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.calendlyUrl).toBe("https://calendly.com/user/meeting")
  })

  it("returns 400 for invalid Instagram URL", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", instagramUrl: "https://twitter.com/user" }),
    })
    try {
      await PATCH(req)
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      expect(e).toBeInstanceOf(Response)
      const res = e as Response
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toMatch(/instagramUrl/)
    }
  })

  it("saves valid Instagram URL with www prefix", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", instagramUrl: "https://www.instagram.com/user" }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.instagramUrl).toBe("https://www.instagram.com/user")
  })

  it("saves valid Instagram URL without www prefix", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", instagramUrl: "https://instagram.com/user" }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.instagramUrl).toBe("https://instagram.com/user")
  })

  it("upserts address fields from JSON body", async () => {
    const addressFields = {
      addressPublic: "true",
      zipCode: "01310-100",
      street: "Av Paulista",
      number: "1000",
      complement: "Sala 10",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    }
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", ...addressFields }),
    })
    await PATCH(req)

    expect(prismaMock.address.upsert).toHaveBeenCalledTimes(1)
    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    expect(upsertCall.where).toEqual({ profileId: "profile-1" })
    expect(upsertCall.update.zipCode).toBe("01310-100")
    expect(upsertCall.update.street).toBe("Av Paulista")
    expect(upsertCall.update.number).toBe("1000")
    expect(upsertCall.update.complement).toBe("Sala 10")
    expect(upsertCall.update.neighborhood).toBe("Bela Vista")
    expect(upsertCall.update.city).toBe("São Paulo")
    expect(upsertCall.update.state).toBe("SP")
    expect(upsertCall.update.public).toBe(true)
    expect(upsertCall.create.profileId).toBe("profile-1")
  })

  it("toBool returns correct booleans for various inputs", async () => {
    // addressPublic "false" -> false
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", addressPublic: "false" }),
    })
    await PATCH(req)

    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    expect(upsertCall.update.public).toBe(false)
  })

  it("toBool returns undefined for empty string, defaults to true", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", addressPublic: "" }),
    })
    await PATCH(req)

    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    // toBool("") returns undefined, so ?? true gives true
    expect(upsertCall.update.public).toBe(true)
  })

  it("toBool returns undefined for undefined addressPublic, defaults to true", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test" }),
    })
    await PATCH(req)

    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    // toBool(undefined) returns undefined, so ?? true gives true
    expect(upsertCall.update.public).toBe(true)
  })

  it("toBool handles '1' and '0' for addressPublic", async () => {
    const req1 = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", addressPublic: "1" }),
    })
    await PATCH(req1)

    const upsertCall1 = prismaMock.address.upsert.mock.calls[0][0]
    expect(upsertCall1.update.public).toBe(true)
  })

  it("saves SEO fields via JSON", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        metaTitle: "SEO Title",
        metaDescription: "SEO Description",
        keywords: "law, attorney",
        gtmContainerId: "GTM-ABCDEF",
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.metaTitle).toBe("SEO Title")
    expect(updateCall.data.metaDescription).toBe("SEO Description")
    expect(updateCall.data.keywords).toBe("law, attorney")
    expect(updateCall.data.gtmContainerId).toBe("GTM-ABCDEF")
  })

  it("nopt converts empty string to null and trims values", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        publicEmail: "",
        publicPhone: "  (11) 99999  ",
        headline: "  ",
        aboutDescription: "A description  ",
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    // Empty string -> null
    expect(updateCall.data.publicEmail).toBeNull()
    // Trimmed
    expect(updateCall.data.publicPhone).toBe("(11) 99999")
    // Whitespace-only -> null
    expect(updateCall.data.headline).toBeNull()
    // Trimmed trailing space
    expect(updateCall.data.aboutDescription).toBe("A description")
  })

  it("handles sectionLabels update", async () => {
    const labels = { sobre: "Sobre Mim", servicos: "Serviços" }
    prismaMock.profile.update.mockResolvedValue({ id: "p1", sectionLabels: labels })
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionLabels: labels }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.sectionLabels).toEqual(labels)
    // Should return early without calling address.upsert
    expect(prismaMock.address.upsert).not.toHaveBeenCalled()
  })

  it("handles sectionIcons update", async () => {
    const icons = { sobre: "user", servicos: "briefcase" }
    prismaMock.profile.update.mockResolvedValue({ id: "p1", sectionIcons: icons })
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionIcons: icons }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.sectionIcons).toEqual(icons)
    expect(prismaMock.address.upsert).not.toHaveBeenCalled()
  })

  it("handles sectionTitleHidden update", async () => {
    const hidden = { sobre: true, servicos: false }
    prismaMock.profile.update.mockResolvedValue({ id: "p1", sectionTitleHidden: hidden })
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionTitleHidden: hidden }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.sectionTitleHidden).toEqual(hidden)
    expect(prismaMock.address.upsert).not.toHaveBeenCalled()
  })

  it("handles color fields via JSON", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        textColor: "#0000FF",
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.primaryColor).toBe("#FF0000")
    expect(updateCall.data.secondaryColor).toBe("#00FF00")
    expect(updateCall.data.textColor).toBe("#0000FF")
  })

  it("handles publicPhoneIsFixed and whatsappIsFixed as booleans from JSON", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        publicPhoneIsFixed: true,
        whatsappIsFixed: false,
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBe(true)
    expect(updateCall.data.whatsappIsFixed).toBe(false)
  })

  it("leaves publicPhoneIsFixed/whatsappIsFixed undefined for non-boolean JSON values", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        publicPhoneIsFixed: "yes",
        whatsappIsFixed: 1,
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.publicPhoneIsFixed).toBeUndefined()
    expect(updateCall.data.whatsappIsFixed).toBeUndefined()
  })

  it("handles Calendly and Instagram as null when empty string (nopt)", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Test",
        calendlyUrl: "",
        instagramUrl: "",
      }),
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    // nopt("") -> null, validateCalendly(null) returns null, no validation error
    expect(updateCall.data.calendlyUrl).toBeNull()
    expect(updateCall.data.instagramUrl).toBeNull()
  })

  it("upserts address fields from FormData", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("addressPublic", "true")
    form.append("zipCode", "01310-100")
    form.append("street", "Av Paulista")
    form.append("number", "1000")
    form.append("complement", "Sala 10")
    form.append("neighborhood", "Bela Vista")
    form.append("city", "São Paulo")
    form.append("state", "SP")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    expect(prismaMock.address.upsert).toHaveBeenCalledTimes(1)
    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    expect(upsertCall.update.public).toBe(true)
    expect(upsertCall.update.zipCode).toBe("01310-100")
    expect(upsertCall.update.street).toBe("Av Paulista")
    expect(upsertCall.update.number).toBe("1000")
    expect(upsertCall.update.city).toBe("São Paulo")
    expect(upsertCall.update.state).toBe("SP")
  })

  it("FormData color fields are set correctly", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("primaryColor", "#111")
    form.append("secondaryColor", "#222")
    form.append("textColor", "#333")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.primaryColor).toBe("#111")
    expect(updateCall.data.secondaryColor).toBe("#222")
    expect(updateCall.data.textColor).toBe("#333")
  })

  it("FormData calendlyUrl is validated and saved", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("calendlyUrl", "https://calendly.com/test/30")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.calendlyUrl).toBe("https://calendly.com/test/30")
  })

  it("FormData instagramUrl is validated and saved", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("instagramUrl", "https://www.instagram.com/test")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.instagramUrl).toBe("https://www.instagram.com/test")
  })

  it("FormData removeAvatar/removeCover 'false' does not nullify URLs", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("removeAvatar", "false")
    form.append("removeCover", "false")

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      body: form,
    })
    await PATCH(req)

    const updateCall = prismaMock.profile.update.mock.calls[0][0]
    expect(updateCall.data.avatarUrl).toBeUndefined()
    expect(updateCall.data.coverUrl).toBeUndefined()
  })

  it("returns address in response after upsert", async () => {
    const savedAddress = {
      id: "addr-1",
      profileId: "profile-1",
      public: true,
      zipCode: "01310-100",
      street: "Av Paulista",
    }
    prismaMock.address.findUnique.mockResolvedValue(savedAddress)

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test" }),
    })
    const res = await PATCH(req)
    const data = await res.json()
    expect(data.address).toEqual(savedAddress)
  })

  it("toBool handles unknown string value, defaults to true via ??", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test", addressPublic: "maybe" }),
    })
    await PATCH(req)

    const upsertCall = prismaMock.address.upsert.mock.calls[0][0]
    // toBool("maybe") returns undefined because "maybe" is not in the true/false lists
    // So ?? true gives true
    expect(upsertCall.update.public).toBe(true)
  })
})
