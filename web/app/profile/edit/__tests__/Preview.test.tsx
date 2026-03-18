import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

// ---------------------------------------------------------------------------
// Hoist fetch mock
// ---------------------------------------------------------------------------
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

// ---------------------------------------------------------------------------
// Mock theme preview sub-components so we don't render real theme trees
// ---------------------------------------------------------------------------
vi.mock("../Preview02", () => ({
  default: ({ profile }: { profile: { publicName?: string | null } }) => (
    <div data-testid="preview-02">Preview02 — {profile.publicName}</div>
  ),
}))

vi.mock("../Preview03", () => ({
  default: ({ profile }: { profile: { publicName?: string | null } }) => (
    <div data-testid="preview-03">Preview03 — {profile.publicName}</div>
  ),
}))

vi.mock("../Preview04", () => ({
  default: ({ profile }: { profile: { publicName?: string | null } }) => (
    <div data-testid="preview-04">Preview04 — {profile.publicName}</div>
  ),
}))

import Preview from "@/app/profile/edit/Preview"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeProfileResponse(theme: string | null, publicName = "Dr. Ana") {
  return {
    ok: true,
    json: async () => ({
      profile: { publicName, theme, primaryColor: "#8B0000", textColor: "#FFFFFF", sectionOrder: null },
      areas: [],
      address: null,
      links: [],
      gallery: [],
      customSections: [],
    }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Preview", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = makeQueryClient()
  })

  it("shows a loading placeholder while data is pending", () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    expect(screen.getByText(/Carregando pré-visualização/i)).toBeInTheDocument()
  })

  it("renders Preview02 (modern theme) by default when theme is null", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse(null))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(screen.getByTestId("preview-02")).toBeInTheDocument()
  })

  it("renders Preview02 (modern theme) when theme is 'modern'", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse("modern"))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(screen.getByTestId("preview-02")).toBeInTheDocument()
    expect(screen.queryByTestId("preview-03")).not.toBeInTheDocument()
    expect(screen.queryByTestId("preview-04")).not.toBeInTheDocument()
  })

  it("renders Preview03 (classic theme) when theme is 'classic'", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse("classic"))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(screen.getByTestId("preview-03")).toBeInTheDocument()
    expect(screen.queryByTestId("preview-02")).not.toBeInTheDocument()
    expect(screen.queryByTestId("preview-04")).not.toBeInTheDocument()
  })

  it("renders Preview04 (corporate theme) when theme is 'corporate'", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse("corporate"))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(screen.getByTestId("preview-04")).toBeInTheDocument()
    expect(screen.queryByTestId("preview-02")).not.toBeInTheDocument()
    expect(screen.queryByTestId("preview-03")).not.toBeInTheDocument()
  })

  it("passes the profile's publicName down to the selected preview component", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse("modern", "Dr. Carlos"))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(screen.getByText(/Dr\. Carlos/)).toBeInTheDocument()
  })

  it("renders nothing when profile is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: null,
        areas: [],
        links: [],
        gallery: [],
        customSections: [],
      }),
    })
    const { container } = render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    // No theme preview component should be in the DOM
    expect(screen.queryByTestId("preview-02")).not.toBeInTheDocument()
    expect(screen.queryByTestId("preview-03")).not.toBeInTheDocument()
    expect(screen.queryByTestId("preview-04")).not.toBeInTheDocument()
    expect(container.firstChild).toBeNull()
  })

  it("calls /api/profile with cache: no-store", async () => {
    mockFetch.mockResolvedValueOnce(makeProfileResponse("modern"))
    render(<Preview />, { wrapper: makeWrapper(queryClient) })
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith("/api/profile", { cache: "no-store" })
  })
})
