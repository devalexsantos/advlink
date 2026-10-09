import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.stubGlobal("fetch", mockFetch)

import { formatCivilDate, useBillingStatus } from "@/components/billing/useBillingStatus"

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("useBillingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the status without forcing a refresh by default", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ billingStatus: "ACTIVE" }) })
    const { result } = renderHook(() => useBillingStatus(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual({ billingStatus: "ACTIVE" }))
    expect(mockFetch).toHaveBeenCalledWith("/api/billing/status", { cache: "no-store" })
  })

  it("asks the server to confirm with Asaas (?refresh=1) while watching", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ billingStatus: "PENDING" }) })
    const { result } = renderHook(() => useBillingStatus({ watch: true }), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(mockFetch).toHaveBeenCalledWith("/api/billing/status?refresh=1", { cache: "no-store" })
  })

  it("exposes an error when the request fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    const { result } = renderHook(() => useBillingStatus(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe("formatCivilDate", () => {
  it("formats YYYY-MM-DD as DD/MM/YYYY", () => {
    expect(formatCivilDate("2026-11-05")).toBe("05/11/2026")
  })

  it.each([null, undefined, ""])("returns a dash for %j", (value) => {
    expect(formatCivilDate(value)).toBe("-")
  })
})
