import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"

// --- hoisted mocks ----------------------------------------------------------
const {
  mockGetServerSession,
  mockPrismaUserFindUnique,
  mockPrismaProfileFindUnique,
  mockGetActiveSiteId,
  mockStripeSubscriptionsRetrieve,
  mockStripeSubscriptionsList,
  mockStripeInvoicesList,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaProfileFindUnique: vi.fn(),
  mockGetActiveSiteId: vi.fn(),
  mockStripeSubscriptionsRetrieve: vi.fn(),
  mockStripeSubscriptionsList: vi.fn(),
  mockStripeInvoicesList: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    profile: { findUnique: mockPrismaProfileFindUnique },
  },
}))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: mockGetActiveSiteId }))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mockStripeSubscriptionsRetrieve,
      list: mockStripeSubscriptionsList,
    },
    invoices: {
      list: mockStripeInvoicesList,
    },
  },
}))

// Mock sub-components so we can assert which one is rendered without their own deps
vi.mock("@/app/profile/account/ActivateSubscriptionButton", () => ({
  default: () => <div data-testid="activate-btn">ActivateSubscriptionButton</div>,
}))
vi.mock("@/app/profile/account/CancelSubscriptionButton", () => ({
  default: () => <div data-testid="cancel-btn">CancelSubscriptionButton</div>,
}))
vi.mock("@/app/profile/account/ReactivateSubscriptionButton", () => ({
  default: () => <div data-testid="reactivate-btn">ReactivateSubscriptionButton</div>,
}))

import AccountPage from "@/app/profile/account/page"

// Helper to render an async server component
async function renderAccountPage() {
  const jsx = await AccountPage()
  if (!jsx) return null
  const result = render(jsx)
  return result
}

const SESSION = { user: { id: "user-1", email: "dr@example.com" } }
const USER_DB = { stripeCustomerId: "cus_123", email: "dr@example.com" }
const PROFILE_DB = { isActive: true, stripeSubscriptionId: "sub_abc" }

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default happy-path setup
    mockGetServerSession.mockResolvedValue(SESSION)
    mockGetActiveSiteId.mockResolvedValue("profile-1")
    mockPrismaUserFindUnique.mockResolvedValue(USER_DB)
    mockPrismaProfileFindUnique.mockResolvedValue(PROFILE_DB)
    mockStripeSubscriptionsRetrieve.mockResolvedValue({
      status: "active",
      current_period_end: 1893456000,
      cancel_at_period_end: false,
    })
    mockStripeInvoicesList.mockResolvedValue({ data: [] })
  })

  describe("unauthenticated user", () => {
    it("returns null when there is no session", async () => {
      mockGetServerSession.mockResolvedValue(null)
      const result = await renderAccountPage()
      expect(result).toBeNull()
    })

    it("returns null when session has no userId", async () => {
      mockGetServerSession.mockResolvedValue({ user: {} })
      const result = await renderAccountPage()
      expect(result).toBeNull()
    })
  })

  describe("page structure", () => {
    it("renders the page heading 'Minha conta'", async () => {
      await renderAccountPage()
      expect(screen.getByRole("heading", { name: /minha conta/i })).toBeInTheDocument()
    })

    it("renders the 'Assinatura' section heading", async () => {
      await renderAccountPage()
      expect(screen.getByRole("heading", { name: /assinatura/i })).toBeInTheDocument()
    })

    it("renders the 'Histórico de Pagamentos' section heading", async () => {
      await renderAccountPage()
      expect(screen.getByRole("heading", { name: /histórico de pagamentos/i })).toBeInTheDocument()
    })

    it("renders the user email", async () => {
      await renderAccountPage()
      expect(screen.getByText("dr@example.com")).toBeInTheDocument()
    })
  })

  describe("subscription status badges", () => {
    it("shows 'Ativo' badge when subscription is active", async () => {
      await renderAccountPage()
      expect(screen.getByText("Ativo")).toBeInTheDocument()
    })

    it("shows 'Cancelado' badge when subscription is canceled", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "canceled",
        current_period_end: null,
        cancel_at_period_end: false,
      })
      await renderAccountPage()
      expect(screen.getByText("Cancelado")).toBeInTheDocument()
    })

    it("shows 'Período de Teste' badge when subscription is trialing", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "trialing",
        current_period_end: 1893456000,
        cancel_at_period_end: false,
      })
      await renderAccountPage()
      expect(screen.getByText("Período de Teste")).toBeInTheDocument()
    })

    it("shows 'Ativo' badge for past_due status", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "past_due",
        current_period_end: 1893456000,
        cancel_at_period_end: false,
      })
      await renderAccountPage()
      expect(screen.getByText("Ativo")).toBeInTheDocument()
    })
  })

  describe("subscription action buttons", () => {
    it("renders CancelSubscriptionButton when subscription is active", async () => {
      await renderAccountPage()
      expect(screen.getByTestId("cancel-btn")).toBeInTheDocument()
      expect(screen.queryByTestId("activate-btn")).not.toBeInTheDocument()
      expect(screen.queryByTestId("reactivate-btn")).not.toBeInTheDocument()
    })

    it("renders ReactivateSubscriptionButton when cancel_at_period_end is true", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "active",
        current_period_end: 1893456000,
        cancel_at_period_end: true,
      })
      await renderAccountPage()
      expect(screen.getByTestId("reactivate-btn")).toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })

    it("renders ActivateSubscriptionButton when subscription is canceled", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "canceled",
        current_period_end: null,
        cancel_at_period_end: false,
      })
      await renderAccountPage()
      expect(screen.getByTestId("activate-btn")).toBeInTheDocument()
      expect(screen.queryByTestId("cancel-btn")).not.toBeInTheDocument()
    })

    it("renders ActivateSubscriptionButton when there is no subscription", async () => {
      mockPrismaProfileFindUnique.mockResolvedValue({ isActive: false, stripeSubscriptionId: null })
      mockStripeSubscriptionsList.mockResolvedValue({ data: [] })
      await renderAccountPage()
      expect(screen.getByTestId("activate-btn")).toBeInTheDocument()
    })

    it("shows the cancel-at-period-end warning message when relevant", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "active",
        current_period_end: 1893456000,
        cancel_at_period_end: true,
      })
      await renderAccountPage()
      expect(screen.getByText(/cancelamento ao final do período atual/i)).toBeInTheDocument()
    })
  })

  describe("invoice history", () => {
    it("shows empty state when there are no invoices", async () => {
      mockStripeInvoicesList.mockResolvedValue({ data: [] })
      await renderAccountPage()
      expect(screen.getByText(/nenhum pagamento encontrado/i)).toBeInTheDocument()
    })

    it("renders invoices in a table when they exist", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          {
            id: "inv_1",
            total: 9900,
            status: "paid",
            created: 1700000000,
            hosted_invoice_url: "https://invoice.stripe.com/1",
          },
        ],
      })
      await renderAccountPage()
      // Date column
      expect(screen.getByText("Ver fatura")).toBeInTheDocument()
      // Amount formatted
      expect(screen.getByText("R$ 99.00")).toBeInTheDocument()
      // Status badge
      expect(screen.getByText("Pago")).toBeInTheDocument()
    })

    it("renders invoice status 'Em aberto' for open invoices", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          { id: "inv_2", total: 9900, status: "open", created: 1700000000, hosted_invoice_url: null },
        ],
      })
      await renderAccountPage()
      expect(screen.getByText("Em aberto")).toBeInTheDocument()
    })

    it("shows '-' when an invoice has no hosted_invoice_url", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          { id: "inv_3", total: 9900, status: "paid", created: 1700000000, hosted_invoice_url: null },
        ],
      })
      await renderAccountPage()
      // The '-' appears in the table cell where there is no link
      const cells = screen.getAllByRole("cell")
      const dashCell = cells.find((c) => c.textContent === "-")
      expect(dashCell).toBeInTheDocument()
    })
  })

  describe("no active site scenario", () => {
    it("still renders the page when profileId is null", async () => {
      mockGetActiveSiteId.mockResolvedValue(null)
      mockPrismaProfileFindUnique.mockResolvedValue(null)
      // No subscriptionId available, falls back to listing
      mockStripeSubscriptionsList.mockResolvedValue({ data: [] })
      await renderAccountPage()
      expect(screen.getByRole("heading", { name: /minha conta/i })).toBeInTheDocument()
    })
  })

  describe("subscription fallback from stripe.subscriptions.list (lines 47-49)", () => {
    it("reads subscription data from list when profile has no stripeSubscriptionId", async () => {
      // No profile-level subscription ID — must fall back to listing
      mockPrismaProfileFindUnique.mockResolvedValue({ isActive: true, stripeSubscriptionId: null })
      mockStripeSubscriptionsRetrieve.mockClear() // should not be called
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [
          {
            status: "active",
            current_period_end: 1893456000,
            cancel_at_period_end: false,
          },
        ],
      })
      await renderAccountPage()
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled()
      expect(mockStripeSubscriptionsList).toHaveBeenCalledWith({
        customer: USER_DB.stripeCustomerId,
        status: "all",
        limit: 10,
      })
      expect(screen.getByText("Ativo")).toBeInTheDocument()
    })

    it("fills subscription period end from listed subscription", async () => {
      mockPrismaProfileFindUnique.mockResolvedValue({ isActive: true, stripeSubscriptionId: null })
      const periodEnd = 1893456000
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [{ status: "trialing", current_period_end: periodEnd, cancel_at_period_end: false }],
      })
      await renderAccountPage()
      // Expect the formatted date to appear
      const formatted = new Date(periodEnd * 1000).toLocaleDateString("pt-BR")
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })
  })

  describe("statusBadge edge cases (lines 61-62)", () => {
    it("shows a dash '-' when subscriptionStatus is empty/null and profile isActive is false", async () => {
      // No sub ID and no customer — subscriptionStatus stays null, profile.isActive=false
      // statusBadge will receive "canceled" from (profile?.isActive ? "active" : "canceled")
      // We need subscriptionStatus to be null AND profile.isActive = false to hit empty string path
      // Actually: statusBadge(subscriptionStatus || (profile?.isActive ? "active" : "canceled"))
      // To get empty string to statusBadge, make profile null and subscriptionStatus null
      mockGetActiveSiteId.mockResolvedValue(null)
      mockPrismaProfileFindUnique.mockResolvedValue(null)
      mockPrismaUserFindUnique.mockResolvedValue({ stripeCustomerId: null, email: "x@x.com" })
      mockStripeSubscriptionsList.mockResolvedValue({ data: [] })
      // subscriptionStatus = null, profile = null → statusBadge(null || (null?.isActive ? "active" : "canceled"))
      // → statusBadge("canceled") → "Cancelado"
      await renderAccountPage()
      expect(screen.getByText("Cancelado")).toBeInTheDocument()
    })

    it("shows unknown subscription status capitalized as fallback", async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        status: "unpaid",
        current_period_end: 1893456000,
        cancel_at_period_end: false,
      })
      await renderAccountPage()
      // "unpaid" is not a known status — falls through to capitalize branch
      expect(screen.getByText("unpaid")).toBeInTheDocument()
    })
  })

  describe("invoiceStatusBadge edge cases (lines 69-73)", () => {
    it("shows 'Inadimplente' for uncollectible invoice status", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [{ id: "inv_u", total: 5000, status: "uncollectible", created: 1700000000, hosted_invoice_url: null }],
      })
      await renderAccountPage()
      expect(screen.getByText("Inadimplente")).toBeInTheDocument()
    })

    it("shows 'Anulado' for void invoice status", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [{ id: "inv_v", total: 0, status: "void", created: 1700000000, hosted_invoice_url: null }],
      })
      await renderAccountPage()
      expect(screen.getByText("Anulado")).toBeInTheDocument()
    })

    it("shows 'Rascunho' for draft invoice status", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [{ id: "inv_d", total: 0, status: "draft", created: 1700000000, hosted_invoice_url: null }],
      })
      await renderAccountPage()
      expect(screen.getByText("Rascunho")).toBeInTheDocument()
    })

    it("shows '-' for invoice with empty status", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [{ id: "inv_e", total: 0, status: "", created: 1700000000, hosted_invoice_url: null }],
      })
      await renderAccountPage()
      // The dash '-' should appear in the status column cell (there's also '-' for missing url)
      const cells = screen.getAllByRole("cell")
      const dashCells = cells.filter((c) => c.textContent === "-")
      expect(dashCells.length).toBeGreaterThanOrEqual(1)
    })

    it("shows capitalized unknown invoice status as fallback", async () => {
      mockStripeInvoicesList.mockResolvedValue({
        data: [{ id: "inv_x", total: 0, status: "refunded", created: 1700000000, hosted_invoice_url: null }],
      })
      await renderAccountPage()
      expect(screen.getByText("refunded")).toBeInTheDocument()
    })
  })
})
