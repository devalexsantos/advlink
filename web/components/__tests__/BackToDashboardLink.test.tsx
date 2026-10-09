import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch, mockPush, mockRefresh } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

import BackToDashboardLink from "@/components/BackToDashboardLink"

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

describe("BackToDashboardLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("switches to the given completed site before going to the dashboard", async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }))
    render(<BackToDashboardLink siteId="site-done" />)

    await userEvent.click(screen.getByRole("button", { name: /voltar ao dashboard/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sites/switch",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ siteId: "site-done" }) })
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/profile/edit"))
  })

  it("renders nothing when the server says there is no completed site", () => {
    const { container } = render(<BackToDashboardLink siteId={null} />)
    expect(container).toBeEmptyDOMElement()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("looks up a completed site when no siteId is given", async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse({ sites: [{ id: "new", setupComplete: false }, { id: "old", setupComplete: true }] })
    )
    render(<BackToDashboardLink />)

    const button = await screen.findByRole("button", { name: /voltar ao dashboard/i })
    mockFetch.mockReturnValueOnce(jsonResponse({ ok: true }))
    await userEvent.click(button)

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/sites/switch",
      expect.objectContaining({ body: JSON.stringify({ siteId: "old" }) })
    )
  })

  it("stays hidden for a first-time user with no completed site", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ sites: [{ id: "new", setupComplete: false }] }))
    const { container } = render(<BackToDashboardLink />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/sites"))
    expect(container).toBeEmptyDOMElement()
  })
})
