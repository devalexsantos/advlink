import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"

// --- hoisted mocks ----------------------------------------------------------
const {
  mockGetServerSession,
  mockUserFindUnique,
  mockProfileFindFirst,
  mockSubscriptionFindFirst,
  mockPaymentFindMany,
  mockGetActiveSiteId,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockProfileFindFirst: vi.fn(),
  mockSubscriptionFindFirst: vi.fn(),
  mockPaymentFindMany: vi.fn(),
  mockGetActiveSiteId: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    profile: { findFirst: mockProfileFindFirst },
    billingSubscription: { findFirst: mockSubscriptionFindFirst },
    billingPayment: { findMany: mockPaymentFindMany },
  },
}))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: mockGetActiveSiteId }))

vi.mock("@/components/billing/PublishCheckout", () => ({
  default: () => <div data-testid="publish-checkout">PublishCheckout</div>,
}))
vi.mock("@/app/profile/account/CancelSubscriptionButton", () => ({
  default: () => <div data-testid="cancel-btn">CancelSubscriptionButton</div>,
}))

import AccountPage from "@/app/profile/account/page"

async function renderAccountPage() {
  const jsx = await AccountPage()
  if (!jsx) return null
  return render(jsx)
}

const SESSION = { user: { id: "user-1" } }

function profile(overrides: Record<string, unknown> = {}) {
  return {
    slug: "joao-silva",
    publicName: "Dr. João Silva",
    name: "João",
    isActive: false,
    billingStatus: "NONE",
    paidUntil: null,
    graceUntil: null,
    suspendedByAdmin: false,
    ...overrides,
  }
}

const OPEN_SUB = { id: "sub-1", profileId: "profile-1", status: "ACTIVE", valueCents: 4900 }

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-1",
    profileId: "profile-1",
    dueDate: "2026-10-05",
    valueCents: 4900,
    billingType: "PIX",
    status: "PENDING",
    revoked: false,
    invoiceUrl: "https://asaas.test/i/1",
    ...overrides,
  }
}

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(SESSION)
    mockGetActiveSiteId.mockResolvedValue("profile-1")
    mockUserFindUnique.mockResolvedValue({ email: "dr@example.com" })
    mockProfileFindFirst.mockResolvedValue(profile())
    mockSubscriptionFindFirst.mockResolvedValue(null)
    mockPaymentFindMany.mockResolvedValue([])
  })

  describe("access and scoping", () => {
    it("renders nothing when there is no session", async () => {
      mockGetServerSession.mockResolvedValue(null)
      expect(await renderAccountPage()).toBeNull()
      expect(mockProfileFindFirst).not.toHaveBeenCalled()
    })

    it("renders nothing when the session has no user id", async () => {
      mockGetServerSession.mockResolvedValue({ user: {} })
      expect(await renderAccountPage()).toBeNull()
    })

    it("scopes profile, subscription and payments to the active site", async () => {
      mockGetActiveSiteId.mockResolvedValue("profile-9")
      await renderAccountPage()
      expect(mockGetActiveSiteId).toHaveBeenCalledWith("user-1")
      expect(mockProfileFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "profile-9", userId: "user-1" } })
      )
      expect(mockSubscriptionFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profileId: "profile-9", status: "ACTIVE" } })
      )
      expect(mockPaymentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profileId: "profile-9" } })
      )
    })

    it("does not query billing data and shows no actions when there is no active site", async () => {
      mockGetActiveSiteId.mockResolvedValue(null)
      await renderAccountPage()
      expect(mockProfileFindFirst).not.toHaveBeenCalled()
      expect(mockSubscriptionFindFirst).not.toHaveBeenCalled()
      expect(mockPaymentFindMany).not.toHaveBeenCalled()
      expect(screen.getByText("Nenhum pagamento encontrado.")).toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })
  })

  describe("site summary", () => {
    it("shows the site name, host and user e-mail", async () => {
      await renderAccountPage()
      expect(screen.getByRole("heading", { name: "Minha conta" })).toBeInTheDocument()
      expect(screen.getByText(/Dr\. João Silva/)).toBeInTheDocument()
      expect(screen.getByText(/joao-silva\.advlink\.site/)).toBeInTheDocument()
      expect(screen.getByText("dr@example.com")).toBeInTheDocument()
    })

    it("flags a site suspended by the team", async () => {
      mockProfileFindFirst.mockResolvedValue(profile({ suspendedByAdmin: true }))
      await renderAccountPage()
      expect(screen.getByText("(suspenso pela equipe)")).toBeInTheDocument()
    })
  })

  describe("status badge", () => {
    it.each([
      ["NONE", "Não publicado"],
      ["PENDING", "Aguardando pagamento"],
      ["ACTIVE", "Ativo"],
      ["GRACE", "Pagamento em atraso"],
      ["SUSPENDED", "Fora do ar (falta de pagamento)"],
      ["CANCELED", "Cancelado"],
    ])("shows the %s status as '%s'", async (billingStatus, label) => {
      mockProfileFindFirst.mockResolvedValue(
        profile({ billingStatus, isActive: billingStatus === "ACTIVE" || billingStatus === "GRACE", paidUntil: new Date("2026-11-05T00:00:00.000Z") })
      )
      await renderAccountPage()
      expect(screen.getByText(label)).toBeInTheDocument()
    })

    it("treats a site published before the Asaas migration as 'Ativo' with no billing actions", async () => {
      mockProfileFindFirst.mockResolvedValue(profile({ billingStatus: "NONE", isActive: true }))
      await renderAccountPage()
      expect(screen.getByText("Ativo")).toBeInTheDocument()
      expect(screen.queryByText("Não publicado")).not.toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })
  })

  describe("published site with an open subscription", () => {
    beforeEach(() => {
      mockProfileFindFirst.mockResolvedValue(
        profile({ billingStatus: "ACTIVE", isActive: true, paidUntil: new Date("2026-11-05T00:00:00.000Z") })
      )
      mockSubscriptionFindFirst.mockResolvedValue(OPEN_SUB)
    })

    it("shows the plan price, the paid-until date and the cancel button", async () => {
      await renderAccountPage()
      expect(screen.getByText(/R\$\s49,00\/mês, renovação automática/)).toBeInTheDocument()
      expect(screen.getByText("Pago até:")).toBeInTheDocument()
      expect(screen.getByText(/05\/11\/2026/)).toBeInTheDocument()
      expect(screen.getByTestId("cancel-btn")).toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
      expect(screen.queryByText(/assinatura cancelada/i)).not.toBeInTheDocument()
    })

    it("keeps the cancel button for a site in the grace period", async () => {
      mockProfileFindFirst.mockResolvedValue(
        profile({ billingStatus: "GRACE", isActive: true, paidUntil: new Date("2026-10-05T00:00:00.000Z") })
      )
      await renderAccountPage()
      expect(screen.getByTestId("cancel-btn")).toBeInTheDocument()
    })
  })

  describe("published site with a canceled subscription", () => {
    it("explains the site stays online until the paid date and offers no buttons", async () => {
      mockProfileFindFirst.mockResolvedValue(
        profile({ billingStatus: "ACTIVE", isActive: true, paidUntil: new Date("2026-11-05T00:00:00.000Z") })
      )
      mockSubscriptionFindFirst.mockResolvedValue(null)
      await renderAccountPage()
      expect(screen.getByText(/Assinatura cancelada\. Seu site fica no ar até 05\/11\/2026/)).toBeInTheDocument()
      expect(screen.getByText("No ar até:")).toBeInTheDocument()
      expect(screen.queryByText(/renovação automática/)).not.toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
    })
  })

  describe("unpublished site", () => {
    it.each(["NONE", "PENDING", "SUSPENDED", "CANCELED"])("offers the publish checkout when billing status is %s", async (billingStatus) => {
      mockProfileFindFirst.mockResolvedValue(profile({ billingStatus, isActive: false }))
      await renderAccountPage()
      expect(screen.getByTestId("publish-checkout")).toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })

    it("hides the checkout when the site was suspended by the team", async () => {
      mockProfileFindFirst.mockResolvedValue(profile({ billingStatus: "SUSPENDED", suspendedByAdmin: true }))
      await renderAccountPage()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })

    it("hides the checkout when the active site profile was not found", async () => {
      mockProfileFindFirst.mockResolvedValue(null)
      await renderAccountPage()
      expect(screen.getByText("Não publicado")).toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
    })
  })

  describe("payments history", () => {
    it("shows an empty state when there are no payments", async () => {
      await renderAccountPage()
      expect(screen.getByText("Nenhum pagamento encontrado.")).toBeInTheDocument()
      expect(screen.queryByRole("table")).not.toBeInTheDocument()
    })

    it("lists each payment with due date, value, method and status", async () => {
      mockPaymentFindMany.mockResolvedValue([
        payment({ id: "p1", dueDate: "2026-10-05", billingType: "PIX", status: "RECEIVED", invoiceUrl: "https://asaas.test/i/paid" }),
        payment({ id: "p2", dueDate: "2026-09-05", billingType: "BOLETO", status: "OVERDUE", invoiceUrl: "https://asaas.test/i/late" }),
        payment({ id: "p3", dueDate: "2026-08-05", billingType: "CREDIT_CARD", status: "CONFIRMED", revoked: true, invoiceUrl: null }),
        payment({ id: "p4", dueDate: "2026-07-05", billingType: "PIX", status: "PENDING", invoiceUrl: "https://asaas.test/i/open" }),
      ])
      await renderAccountPage()

      const rows = screen.getAllByRole("row").slice(1) // skip header
      expect(rows).toHaveLength(4)

      const paid = within(rows[0])
      expect(paid.getByText("05/10/2026")).toBeInTheDocument()
      expect(paid.getByText(/R\$\s49,00/)).toBeInTheDocument()
      expect(paid.getByText("Pix")).toBeInTheDocument()
      expect(paid.getByText("Pago")).toBeInTheDocument()
      expect(paid.getByRole("link", { name: "Ver comprovante" })).toHaveAttribute("href", "https://asaas.test/i/paid")

      const overdue = within(rows[1])
      expect(overdue.getByText("Boleto")).toBeInTheDocument()
      expect(overdue.getByText("Vencido")).toBeInTheDocument()
      expect(overdue.getByRole("link", { name: "Pagar" })).toHaveAttribute("href", "https://asaas.test/i/late")

      const refunded = within(rows[2])
      expect(refunded.getByText("Cartão de crédito")).toBeInTheDocument()
      expect(refunded.getByText("Estornado")).toBeInTheDocument()
      expect(refunded.queryByRole("link")).not.toBeInTheDocument()

      const open = within(rows[3])
      expect(open.getByText("Em aberto")).toBeInTheDocument()
      expect(open.getByRole("link", { name: "Pagar" })).toHaveAttribute("href", "https://asaas.test/i/open")
    })

    it("opens invoice links in a new tab safely", async () => {
      mockPaymentFindMany.mockResolvedValue([payment()])
      await renderAccountPage()
      const link = screen.getByRole("link", { name: "Pagar" })
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    })

    it("shows 'Em análise' for payments under risk analysis", async () => {
      mockPaymentFindMany.mockResolvedValue([payment({ status: "AWAITING_RISK_ANALYSIS" })])
      await renderAccountPage()
      expect(screen.getByText("Em análise")).toBeInTheDocument()
    })

    it("treats a refunded payment as 'Estornado' even though its status is paid", async () => {
      mockPaymentFindMany.mockResolvedValue([payment({ status: "RECEIVED", revoked: true })])
      await renderAccountPage()
      expect(screen.getByText("Estornado")).toBeInTheDocument()
      expect(screen.queryByText("Pago")).not.toBeInTheDocument()
    })
  })
})
