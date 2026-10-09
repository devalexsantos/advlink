// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, logAuditMock, getBillingDepsMock, recomputeProfileMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    billingSubscription: { count: vi.fn() },
    billingPayment: { count: vi.fn() },
    billingPaymentLink: { count: vi.fn() },
  },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
  getBillingDepsMock: vi.fn(),
  recomputeProfileMock: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/audit-log", () => ({ logAudit: logAuditMock }))
vi.mock("@/lib/billing/deps", () => ({ getBillingDeps: getBillingDepsMock }))
vi.mock("@/lib/billing/sync", () => ({ recomputeProfile: recomputeProfileMock }))

import { GET, PATCH } from "@/app/api/admin/sites/[id]/route"

const adminSession = { id: "admin-1", role: "admin" }
const deps = { asaas: { environment: "SANDBOX" } }
const params = { params: Promise.resolve({ id: "site-1" }) }

function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: "site-1" }) }
  )
}

function setBillingRows(n: { subs?: number; payments?: number; links?: number } = {}) {
  prismaMock.billingSubscription.count.mockResolvedValue(n.subs ?? 0)
  prismaMock.billingPayment.count.mockResolvedValue(n.payments ?? 0)
  prismaMock.billingPaymentLink.count.mockResolvedValue(n.links ?? 0)
}

describe("GET /api/admin/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingDepsMock.mockReturnValue(null)
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), params)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 404 when site does not exist", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.profile.findUnique.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Site não encontrado")
  })

  it("returns site with user and billing data, never Stripe fields", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const site = {
      id: "site-1",
      slug: "dr-silva",
      isActive: true,
      billingStatus: "ACTIVE",
      paidUntil: "2026-11-09T00:00:00.000Z",
      suspendedByAdmin: false,
      user: { id: "user-1", name: "Dr. Silva", email: "silva@oab.com", isActive: true },
      billingSubscriptions: [{ status: "ACTIVE", valueCents: 4900 }],
      billingPayments: [],
    }
    prismaMock.profile.findUnique.mockResolvedValue(site)
    const res = await GET(new Request("http://localhost"), params)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe("site-1")
    expect(json.user.email).toBe("silva@oab.com")
    expect(json.billingStatus).toBe("ACTIVE")

    const query = prismaMock.profile.findUnique.mock.calls[0][0]
    expect(query.where).toEqual({ id: "site-1" })
    expect(query.include).toBeUndefined()
    expect(query.select.stripeSubscriptionId).toBeUndefined()
    expect(query.select.user.select.stripeCustomerId).toBeUndefined()
    expect(query.select.billingSubscriptions.where).toEqual({ environment: "PRODUCTION" })
  })

  it("filters billing rows by the configured Asaas environment", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    getBillingDepsMock.mockReturnValue(deps)
    prismaMock.profile.findUnique.mockResolvedValue({ id: "site-1" })
    await GET(new Request("http://localhost"), params)
    const query = prismaMock.profile.findUnique.mock.calls[0][0]
    expect(query.select.billingPayments.where).toEqual({ environment: "SANDBOX" })
  })
})

describe("PATCH /api/admin/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue(adminSession)
    getBillingDepsMock.mockReturnValue(deps)
    prismaMock.profile.update.mockResolvedValue({})
    recomputeProfileMock.mockResolvedValue("ACTIVE")
    setBillingRows()
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await patch({ suspended: true })
    expect(res.status).toBe(401)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("returns 400 for an invalid body", async () => {
    const res = await patch({ isActive: false })
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("returns 404 when the site does not exist", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null)
    const res = await patch({ suspended: true })
    expect(res.status).toBe(404)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("suspends a billed site: sets suspendedByAdmin, unpublishes and recomputes", async () => {
    const before = { isActive: true, suspendedByAdmin: false, billingStatus: "ACTIVE" }
    const after = { id: "site-1", isActive: false, suspendedByAdmin: true, billingStatus: "ACTIVE" }
    prismaMock.profile.findUnique.mockResolvedValueOnce(before).mockResolvedValueOnce(after)

    const res = await patch({ suspended: true })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(after)
    expect(prismaMock.profile.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { suspendedByAdmin: true, isActive: false },
    })
    expect(recomputeProfileMock).toHaveBeenCalledWith(deps, "site-1")
    expect(logAuditMock).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      action: "site_suspended",
      entityType: "Profile",
      entityId: "site-1",
      before,
      after: { isActive: false, suspendedByAdmin: true, billingStatus: "ACTIVE" },
    })
  })

  it("reactivates a billed site: clears suspendedByAdmin and lets recompute decide isActive", async () => {
    const before = { isActive: false, suspendedByAdmin: true, billingStatus: "ACTIVE" }
    const after = { id: "site-1", isActive: true, suspendedByAdmin: false, billingStatus: "ACTIVE" }
    prismaMock.profile.findUnique.mockResolvedValueOnce(before).mockResolvedValueOnce(after)

    const res = await patch({ suspended: false })

    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { suspendedByAdmin: false },
    })
    expect(recomputeProfileMock).toHaveBeenCalledWith(deps, "site-1")
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "site_reactivated", before, after: { isActive: true, suspendedByAdmin: false, billingStatus: "ACTIVE" } })
    )
  })

  it("counts billing rows only in the configured environment", async () => {
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: true, billingStatus: "NONE" })
      .mockResolvedValueOnce({ id: "site-1" })
    await patch({ suspended: false })
    expect(prismaMock.billingSubscription.count).toHaveBeenCalledWith({ where: { profileId: "site-1", environment: "SANDBOX" } })
    expect(prismaMock.billingPaymentLink.count).toHaveBeenCalledWith({
      where: { profileId: "site-1", environment: "SANDBOX", status: "ACTIVE" },
    })
  })

  it("without an Asaas client, reactivation publishes only if billing is ACTIVE|GRACE", async () => {
    getBillingDepsMock.mockReturnValue(null)
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: true, billingStatus: "GRACE" })
      .mockResolvedValueOnce({ id: "site-1" })
    await patch({ suspended: false })
    expect(recomputeProfileMock).not.toHaveBeenCalled()
    expect(prismaMock.profile.update).toHaveBeenLastCalledWith({ where: { id: "site-1" }, data: { isActive: true } })
  })

  it("without an Asaas client, reactivating an unpaid site keeps it offline", async () => {
    getBillingDepsMock.mockReturnValue(null)
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: true, billingStatus: "SUSPENDED" })
      .mockResolvedValueOnce({ id: "site-1" })
    await patch({ suspended: false })
    expect(prismaMock.profile.update).toHaveBeenLastCalledWith({ where: { id: "site-1" }, data: { isActive: false } })
  })

  it("falls back to the stored billing status when recompute fails", async () => {
    recomputeProfileMock.mockRejectedValue(new Error("Asaas fora do ar"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: true, billingStatus: "ACTIVE" })
      .mockResolvedValueOnce({ id: "site-1" })

    const res = await patch({ suspended: false })

    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenLastCalledWith({ where: { id: "site-1" }, data: { isActive: true } })
    errorSpy.mockRestore()
  })

  it("does not fail when the Asaas client is misconfigured", async () => {
    getBillingDepsMock.mockImplementation(() => {
      throw new Error("chave do Asaas não combina")
    })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({ isActive: true, suspendedByAdmin: false, billingStatus: "ACTIVE" })
      .mockResolvedValueOnce({ id: "site-1" })

    const res = await patch({ suspended: true })

    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { suspendedByAdmin: true, isActive: false },
    })
    errorSpy.mockRestore()
  })

  describe("legacy site (billingStatus NONE, no billing rows)", () => {
    it("suspension unpublishes without recompute", async () => {
      prismaMock.profile.findUnique
        .mockResolvedValueOnce({ isActive: true, suspendedByAdmin: false, billingStatus: "NONE" })
        .mockResolvedValueOnce({ id: "site-1", isActive: false, suspendedByAdmin: true, billingStatus: "NONE" })

      const res = await patch({ suspended: true })

      expect(res.status).toBe(200)
      expect(prismaMock.profile.update).toHaveBeenCalledTimes(1)
      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { id: "site-1" },
        data: { suspendedByAdmin: true, isActive: false },
      })
      expect(recomputeProfileMock).not.toHaveBeenCalled()
      expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "site_suspended" }))
    })

    it("reactivation publishes again (previous behaviour)", async () => {
      prismaMock.profile.findUnique
        .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: false, billingStatus: "NONE" })
        .mockResolvedValueOnce({ id: "site-1", isActive: true, suspendedByAdmin: false, billingStatus: "NONE" })

      const res = await patch({ suspended: false })

      expect(res.status).toBe(200)
      expect(prismaMock.profile.update).toHaveBeenCalledTimes(1)
      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { id: "site-1" },
        data: { suspendedByAdmin: false, isActive: true },
      })
      expect(recomputeProfileMock).not.toHaveBeenCalled()
      expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "site_reactivated" }))
    })

    it("a NONE site with an open checkout is not legacy: reactivation goes through recompute", async () => {
      setBillingRows({ links: 1 })
      prismaMock.profile.findUnique
        .mockResolvedValueOnce({ isActive: false, suspendedByAdmin: true, billingStatus: "NONE" })
        .mockResolvedValueOnce({ id: "site-1" })

      await patch({ suspended: false })

      expect(prismaMock.profile.update).toHaveBeenCalledWith({ where: { id: "site-1" }, data: { suspendedByAdmin: false } })
      expect(recomputeProfileMock).toHaveBeenCalledWith(deps, "site-1")
    })
  })
})
