import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders as render } from "@/test/test-utils"

const { fetchProfileMock, useBillingStatusMock } = vi.hoisted(() => ({
  fetchProfileMock: vi.fn(),
  useBillingStatusMock: vi.fn(),
}))

vi.mock("@/app/profile/edit/api", () => ({ fetchProfile: fetchProfileMock, createPreviewLink: vi.fn() }))
vi.mock("@/app/profile/edit/ChangeSlugButton", () => ({
  default: ({ effectiveSlug }: { effectiveSlug: string }) => <button type="button">Alterar link ({effectiveSlug})</button>,
}))
vi.mock("@/components/billing/PublishCheckout", () => ({
  default: ({ compact }: { compact?: boolean }) => (
    <div data-testid="publish-checkout" data-compact={compact ? "true" : "false"}>
      PublishCheckout
    </div>
  ),
}))
vi.mock("@/components/billing/useBillingStatus", async () => {
  const actual = await vi.importActual<typeof import("@/components/billing/useBillingStatus")>(
    "@/components/billing/useBillingStatus"
  )
  return { ...actual, useBillingStatus: useBillingStatusMock }
})

import SubscribeCTA from "@/app/profile/edit/SubscribeCTA"

type Billing = {
  billingStatus: "NONE" | "PENDING" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELED"
  suspendedByAdmin: boolean
  pendingPayment: { invoiceUrl: string | null; dueDate: string; billingType: string; status: string } | null
}

function billing(overrides: Partial<Billing> = {}): { data: Billing } {
  return { data: { billingStatus: "NONE", suspendedByAdmin: false, pendingPayment: null, ...overrides } }
}

describe("SubscribeCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchProfileMock.mockResolvedValue({ profile: { slug: "joao-silva-1-x7k" } })
    useBillingStatusMock.mockReturnValue(billing())
  })

  describe("default state (never published or canceled)", () => {
    it.each(["NONE", "CANCELED"] as const)("shows the unpublished warning and the publish checkout when status is %s", async (billingStatus) => {
      useBillingStatusMock.mockReturnValue(billing({ billingStatus }))
      render(<SubscribeCTA />)
      expect(screen.getByText("Sua página ainda não está publicada.")).toBeInTheDocument()
      expect(screen.getByTestId("publish-checkout")).toHaveAttribute("data-compact", "false")
      expect(await screen.findByText("joao-silva-1-x7k.advlink.site")).toBeInTheDocument()
    })

    it("offers to share a preview of the unpublished site", () => {
      render(<SubscribeCTA />)
      expect(screen.getByRole("button", { name: "Compartilhar prévia" })).toBeInTheDocument()
    })

    it("shows the price and cancellation promise", () => {
      render(<SubscribeCTA />)
      expect(screen.getByText(/Publique por R\$\s49,00\/mês\. Cancele quando quiser\./)).toBeInTheDocument()
    })

    it("lets the user change the future address before paying", async () => {
      render(<SubscribeCTA />)
      expect(await screen.findByRole("button", { name: "Alterar link (joao-silva-1-x7k)" })).toBeInTheDocument()
    })

    it("hides the address line when there is no slug yet", async () => {
      fetchProfileMock.mockResolvedValue({ profile: { slug: null } })
      render(<SubscribeCTA />)
      await screen.findByText("Sua página ainda não está publicada.")
      expect(screen.queryByText(/seu endereço será/i)).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /alterar link/i })).not.toBeInTheDocument()
    })

    it("still offers the checkout while the billing status is loading", () => {
      useBillingStatusMock.mockReturnValue({ data: undefined })
      render(<SubscribeCTA />)
      expect(screen.getByText("Sua página ainda não está publicada.")).toBeInTheDocument()
      expect(screen.getByTestId("publish-checkout")).toBeInTheDocument()
    })
  })

  describe("PENDING payment", () => {
    it("shows the waiting message with a boleto link and due date", () => {
      useBillingStatusMock.mockReturnValue(
        billing({
          billingStatus: "PENDING",
          pendingPayment: { invoiceUrl: "https://asaas.test/i/1", dueDate: "2026-10-12", billingType: "BOLETO", status: "PENDING" },
        })
      )
      render(<SubscribeCTA />)
      expect(screen.getByText("Aguardando a confirmação do pagamento.")).toBeInTheDocument()
      const link = screen.getByRole("link", { name: /Ver boleto \(vence em 12\/10\/2026\)/ })
      expect(link).toHaveAttribute("href", "https://asaas.test/i/1")
      expect(screen.getByTestId("publish-checkout")).toHaveAttribute("data-compact", "true")
      expect(screen.queryByText("Sua página ainda não está publicada.")).not.toBeInTheDocument()
    })

    it("labels non-boleto charges as 'Ver cobrança'", () => {
      useBillingStatusMock.mockReturnValue(
        billing({
          billingStatus: "PENDING",
          pendingPayment: { invoiceUrl: "https://asaas.test/i/2", dueDate: "2026-10-12", billingType: "PIX", status: "PENDING" },
        })
      )
      render(<SubscribeCTA />)
      expect(screen.getByRole("link", { name: /Ver cobrança \(vence em 12\/10\/2026\)/ })).toBeInTheDocument()
    })

    it("omits the invoice link when the charge has no invoice url", () => {
      useBillingStatusMock.mockReturnValue(
        billing({
          billingStatus: "PENDING",
          pendingPayment: { invoiceUrl: null, dueDate: "2026-10-12", billingType: "PIX", status: "PENDING" },
        })
      )
      render(<SubscribeCTA />)
      expect(screen.getByText("Aguardando a confirmação do pagamento.")).toBeInTheDocument()
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })
  })

  describe("SUSPENDED for non-payment", () => {
    it("shows the offline message, the open invoice and an alternative checkout", () => {
      useBillingStatusMock.mockReturnValue(
        billing({
          billingStatus: "SUSPENDED",
          pendingPayment: { invoiceUrl: "https://asaas.test/i/3", dueDate: "2026-09-05", billingType: "BOLETO", status: "OVERDUE" },
        })
      )
      render(<SubscribeCTA />)
      expect(screen.getByText("Seu site está fora do ar por falta de pagamento.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Pagar fatura de 05/09/2026" })).toHaveAttribute("href", "https://asaas.test/i/3")
      expect(screen.getByText("Prefere outra forma de pagamento?")).toBeInTheDocument()
      expect(screen.getByTestId("publish-checkout")).toHaveAttribute("data-compact", "true")
    })

    it("still offers the checkout when there is no open invoice", () => {
      useBillingStatusMock.mockReturnValue(billing({ billingStatus: "SUSPENDED" }))
      render(<SubscribeCTA />)
      expect(screen.getByText("Seu site está fora do ar por falta de pagamento.")).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /pagar fatura/i })).not.toBeInTheDocument()
      expect(screen.getByTestId("publish-checkout")).toBeInTheDocument()
    })
  })

  describe("suspended by admin", () => {
    it("points to support and offers no checkout", () => {
      useBillingStatusMock.mockReturnValue(billing({ billingStatus: "SUSPENDED", suspendedByAdmin: true }))
      render(<SubscribeCTA />)
      expect(screen.getByText("Seu site foi suspenso pela nossa equipe.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "abra um chamado no suporte" })).toHaveAttribute("href", "/profile/tickets/new")
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
      expect(screen.queryByText("Seu site está fora do ar por falta de pagamento.")).not.toBeInTheDocument()
    })

    it("takes priority over any billing status", () => {
      useBillingStatusMock.mockReturnValue(billing({ billingStatus: "PENDING", suspendedByAdmin: true }))
      render(<SubscribeCTA />)
      expect(screen.getByText("Seu site foi suspenso pela nossa equipe.")).toBeInTheDocument()
      expect(screen.queryByTestId("publish-checkout")).not.toBeInTheDocument()
    })
  })
})
