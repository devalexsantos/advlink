import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders as render } from "@/test/test-utils"

const { useBillingStatusMock } = vi.hoisted(() => ({ useBillingStatusMock: vi.fn() }))

vi.mock("@/components/billing/useBillingStatus", async () => {
  const actual = await vi.importActual<typeof import("@/components/billing/useBillingStatus")>(
    "@/components/billing/useBillingStatus"
  )
  return { ...actual, useBillingStatus: useBillingStatusMock }
})

import OverdueAlert from "@/components/billing/OverdueAlert"

describe("OverdueAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing while the status is loading", () => {
    useBillingStatusMock.mockReturnValue({ data: undefined })
    const { container } = render(<OverdueAlert />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each(["NONE", "PENDING", "ACTIVE", "SUSPENDED", "CANCELED"])("renders nothing when billing status is %s", (billingStatus) => {
    useBillingStatusMock.mockReturnValue({ data: { billingStatus, graceUntil: null, pendingPayment: null } })
    render(<OverdueAlert />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("warns about the late payment with the date the site goes offline and a pay link", () => {
    useBillingStatusMock.mockReturnValue({
      data: {
        billingStatus: "GRACE",
        graceUntil: "2026-10-15",
        pendingPayment: { invoiceUrl: "https://asaas.test/i/9", dueDate: "2026-10-05", billingType: "BOLETO", status: "OVERDUE" },
      },
    })
    render(<OverdueAlert />)
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Pagamento em atraso.")
    expect(alert).toHaveTextContent("Seu site continua no ar até 15/10/2026.")
    const link = screen.getByRole("link", { name: "Pagar agora" })
    expect(link).toHaveAttribute("href", "https://asaas.test/i/9")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("omits the pay link when the charge has no invoice url", () => {
    useBillingStatusMock.mockReturnValue({
      data: { billingStatus: "GRACE", graceUntil: "2026-10-15", pendingPayment: { invoiceUrl: null, dueDate: "2026-10-05", billingType: "PIX", status: "OVERDUE" } },
    })
    render(<OverdueAlert />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Pagar agora" })).not.toBeInTheDocument()
  })

  it("still alerts when there is no pending payment loaded", () => {
    useBillingStatusMock.mockReturnValue({ data: { billingStatus: "GRACE", graceUntil: "2026-10-15", pendingPayment: null } })
    render(<OverdueAlert />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
