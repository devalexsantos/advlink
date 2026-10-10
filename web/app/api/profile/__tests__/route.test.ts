// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { jpegFile, pngFile, spoofedHtmlFile } from "@/test/fixtures/images"

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

  it("rejects a gtmContainerId that is not GTM-XXXX (script injection)", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Updated Name", gtmContainerId: "GTM-X');alert(1)//" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("returns 400 for an unknown theme", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Updated Name", theme: "neon" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("normalizes a valid gtmContainerId to upper case", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Updated Name", gtmContainerId: " gtm-ab12cd3 " }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update.mock.calls.at(-1)![0].data.gtmContainerId).toBe("GTM-AB12CD3")
  })

  it("sanitizes aboutDescription HTML before saving (stored XSS)", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicName: "Updated Name",
        aboutDescription: '<p>Sobre</p><img src=x onerror="fetch(\'/api/admin/admins\')"><script>alert(1)</script>',
      }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = prismaMock.profile.update.mock.calls.at(-1)![0].data
    expect(data.aboutDescription).toBe("<p>Sobre</p>")
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

  it("rejects a spoofed cover (HTML sent as image/jpeg) with 400 before any upload", async () => {
    const form = new FormData()
    form.append("publicName", "Test")
    form.append("photo", pngFile("avatar.png"))
    form.append("cover", spoofedHtmlFile("cover.jpg"))
    const res = await PATCH(new Request("http://localhost/api/profile", { method: "PATCH", body: form }))
    expect(res.status).toBe(400)
    expect(uploadToS3Mock).not.toHaveBeenCalled()
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("uploads avatar via FormData photo field", async () => {
    const file = pngFile("avatar.png")
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
    const file = jpegFile("cover.jpg")
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
    expect(s3Call.key).toMatch(/^covers\/profile-1\.\d+\.jpg$/)
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
    // Must be returned, not thrown: a thrown Response becomes a 500 in a route handler
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/calendlyUrl/)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
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
    // Must be returned, not thrown: a thrown Response becomes a 500 in a route handler
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/instagramUrl/)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
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

describe("PATCH /api/profile — OAB and practice type", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findFirst.mockResolvedValue(null)
    prismaMock.profile.update.mockResolvedValue({ id: "profile-1" })
    prismaMock.address.upsert.mockResolvedValue({})
    prismaMock.address.findUnique.mockResolvedValue(null)
  })

  const jsonPatch = (body: Record<string, unknown>) =>
    PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicName: "X", ...body }),
      }),
    )
  const formPatch = (fields: Record<string, string>) => {
    const form = new FormData()
    form.append("publicName", "X")
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    return PATCH(new Request("http://localhost/api/profile", { method: "PATCH", body: form }))
  }
  const lastData = () => prismaMock.profile.update.mock.calls.at(-1)![0].data

  it("normalizes and saves OAB and practiceType via JSON, scoped to the active site", async () => {
    const res = await jsonPatch({ oabNumber: "123.456-a", oabState: "sp", practiceType: "autonomo" })
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update.mock.calls.at(-1)![0].where).toEqual({ id: "profile-1" })
    expect(lastData()).toMatchObject({ oabNumber: "123456A", oabState: "SP", practiceType: "autonomo" })
  })

  it("leaves the fields untouched when the keys are absent (JSON and multipart)", async () => {
    await jsonPatch({})
    expect(lastData().oabNumber).toBeUndefined()
    expect(lastData().oabState).toBeUndefined()
    expect(lastData().practiceType).toBeUndefined()
    await formPatch({})
    expect(lastData().oabNumber).toBeUndefined()
    expect(lastData().oabState).toBeUndefined()
    expect(lastData().practiceType).toBeUndefined()
  })

  it("clears with empty strings", async () => {
    await formPatch({ oabNumber: "", oabState: "", practiceType: "" })
    expect(lastData()).toMatchObject({ oabNumber: null, oabState: null, practiceType: null })
  })

  it("saves via multipart when keys are present", async () => {
    const res = await formPatch({ oabNumber: "9876", oabState: "MG", practiceType: "escritorio" })
    expect(res.status).toBe(200)
    expect(lastData()).toMatchObject({ oabNumber: "9876", oabState: "MG", practiceType: "escritorio" })
  })

  it.each([
    [{ oabNumber: "1234567" }],
    [{ oabNumber: "abc" }],
    [{ oabState: "XX" }],
    [{ practiceType: "empresa" }],
  ])("returns 400 for %j", async (body) => {
    const res = await jsonPatch(body)
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/profile — networks, firm data and service info", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findFirst.mockResolvedValue(null)
    prismaMock.profile.update.mockResolvedValue({ id: "profile-1" })
    prismaMock.address.upsert.mockResolvedValue({})
    prismaMock.address.findUnique.mockResolvedValue(null)
  })

  const jsonPatch = (body: Record<string, unknown>) =>
    PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicName: "X", ...body }),
      }),
    )
  const formPatch = (fields: Record<string, string>) => {
    const form = new FormData()
    form.append("publicName", "X")
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    return PATCH(new Request("http://localhost/api/profile", { method: "PATCH", body: form }))
  }
  const lastData = () => prismaMock.profile.update.mock.calls.at(-1)![0].data
  const NEW_KEYS = [
    "linkedinUrl", "facebookUrl", "youtubeUrl", "whatsappMessage", "firmName", "firmType",
    "firmOabRegistration", "firmCnpj", "officeHours", "languages", "onlineService",
  ]

  const valid = {
    linkedinUrl: "https://www.linkedin.com/in/joao",
    facebookUrl: "https://m.facebook.com/joao",
    youtubeUrl: "https://youtu.be/abc123",
    whatsappMessage: "  Olá, vim pelo site.  ",
    firmName: " Silva Advogados ",
    firmType: "sociedade",
    firmOabRegistration: "OAB/SP 12.345",
    firmCnpj: "11.222.333/0001-81",
    officeHours: "Seg a sex, 9h às 18h",
    languages: "Português, Inglês",
  }
  const expected = {
    ...valid,
    whatsappMessage: "Olá, vim pelo site.",
    firmName: "Silva Advogados",
    firmCnpj: "11222333000181",
  }

  it("saves the fields via JSON (trimmed, CNPJ as digits) scoped to the active site", async () => {
    const res = await jsonPatch({ ...valid, onlineService: true })
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update.mock.calls.at(-1)![0].where).toEqual({ id: "profile-1" })
    expect(lastData()).toMatchObject({ ...expected, onlineService: true })
  })

  it("saves the fields via multipart", async () => {
    const res = await formPatch({ ...valid, onlineService: "false" })
    expect(res.status).toBe(200)
    expect(lastData()).toMatchObject({ ...expected, onlineService: false })
  })

  it("accepts youtube.com and plain linkedin/facebook hosts", async () => {
    const res = await jsonPatch({
      youtubeUrl: "https://www.youtube.com/@joao",
      linkedinUrl: "https://linkedin.com/company/x",
      facebookUrl: "https://facebook.com/x",
    })
    expect(res.status).toBe(200)
  })

  it("leaves the fields untouched when the keys are absent (JSON and multipart)", async () => {
    await jsonPatch({})
    for (const k of NEW_KEYS) expect(lastData()[k]).toBeUndefined()
    await formPatch({})
    for (const k of NEW_KEYS) expect(lastData()[k]).toBeUndefined()
  })

  it("clears with empty strings (multipart) and null/empty (JSON)", async () => {
    const empty = Object.fromEntries(Object.keys(valid).map((k) => [k, ""]))
    await formPatch(empty)
    expect(lastData()).toMatchObject(Object.fromEntries(Object.keys(valid).map((k) => [k, null])))
    await jsonPatch({ ...empty, firmCnpj: null, linkedinUrl: null })
    expect(lastData()).toMatchObject(Object.fromEntries(Object.keys(valid).map((k) => [k, null])))
  })

  it("ignores a non-boolean onlineService in JSON", async () => {
    await jsonPatch({ onlineService: "true" })
    expect(lastData().onlineService).toBeUndefined()
  })

  it.each([
    [{ linkedinUrl: "https://evil.com/linkedin.com/x" }, /linkedinUrl/],
    [{ linkedinUrl: "http://linkedin.com/in/x" }, /linkedinUrl/],
    [{ facebookUrl: "https://facebook.com.evil.com/x" }, /facebookUrl/],
    [{ youtubeUrl: "javascript:alert(1)" }, /youtubeUrl/],
    [{ youtubeUrl: "https://youtube.co/x" }, /youtubeUrl/],
    [{ whatsappMessage: "a".repeat(201) }, /WhatsApp/],
    [{ firmType: "ltda" }, /Tipo de escritório/],
    [{ firmCnpj: "11.222.333/0001-82" }, /CNPJ inválido/],
    [{ firmCnpj: "abc" }, /CNPJ inválido/],
    [{ firmCnpj: "11111111111111" }, /CNPJ inválido/],
    [{ firmName: "a".repeat(121) }, /120/],
    [{ firmOabRegistration: "a".repeat(41) }, /40/],
    [{ officeHours: "a".repeat(81) }, /80/],
    [{ languages: "a".repeat(81) }, /80/],
  ])("returns 400 for %j", async (body, message) => {
    const res = await jsonPatch(body)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(message)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("rejects invalid values via multipart too", async () => {
    const res = await formPatch({ firmCnpj: "123" })
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("accepts a 200-char WhatsApp message", async () => {
    const res = await jsonPatch({ whatsappMessage: "a".repeat(200) })
    expect(res.status).toBe(200)
  })
})

describe("GET /api/profile — area FAQs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1" })
    prismaMock.activityAreas.findMany.mockResolvedValue([])
    prismaMock.address.findUnique.mockResolvedValue(null)
    prismaMock.links.findMany.mockResolvedValue([])
    prismaMock.gallery.findMany.mockResolvedValue([])
    prismaMock.customSection.findMany.mockResolvedValue([])
    prismaMock.teamMember.findMany.mockResolvedValue([])
  })

  it("loads the areas of the active site with their FAQs ordered by position", async () => {
    await GET()
    expect(prismaMock.activityAreas.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: "profile-1" },
        include: {
          faqs: { orderBy: { position: "asc" }, select: { id: true, question: true, answer: true, position: true } },
        },
      }),
    )
  })
})
