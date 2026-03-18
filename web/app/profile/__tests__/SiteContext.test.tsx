import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

import { useSite, SiteProvider } from "@/app/profile/SiteContext"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Do not cache between tests
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

function makeWrapper(initialSiteId: string | null = null) {
  const queryClient = makeQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SiteProvider initialSiteId={initialSiteId}>{children}</SiteProvider>
      </QueryClientProvider>
    )
  }
}

function makeQueryOnlyWrapper() {
  const queryClient = makeQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const fakeSites = [
  {
    id: "site-1",
    name: "Escritório SP",
    publicName: "Dr. João",
    slug: "joao-sp",
    isActive: true,
    setupComplete: true,
    avatarUrl: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "site-2",
    name: "Site Pessoal",
    publicName: null,
    slug: "joao-pessoal",
    isActive: false,
    setupComplete: false,
    avatarUrl: null,
    createdAt: "2024-02-01T00:00:00.000Z",
  },
]

describe("SiteContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useSite — guard", () => {
    it("throws an error when used outside SiteProvider", () => {
      // Suppress the React error boundary console output during this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const wrapper = makeQueryOnlyWrapper()
      expect(() => renderHook(() => useSite(), { wrapper })).toThrow(
        "useSite must be used within SiteProvider"
      )
      consoleSpy.mockRestore()
    })
  })

  describe("SiteProvider — data fetching", () => {
    it("exposes an empty sites array and isLoading=true initially", () => {
      // Never resolves so we can observe the loading state
      mockFetch.mockReturnValue(new Promise(() => {}))
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-1") })
      expect(result.current.isLoading).toBe(true)
      expect(result.current.sites).toEqual([])
    })

    it("fetches /api/sites and exposes the returned sites", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-1") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.sites).toEqual(fakeSites)
    })

    it("sets activeSite to the site matching initialSiteId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-2") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.activeSite?.id).toBe("site-2")
    })

    it("falls back to the first site when initialSiteId does not match any site", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("nonexistent-id") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.activeSite?.id).toBe("site-1")
    })

    it("falls back to the first site when initialSiteId is null", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper(null) })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.activeSite?.id).toBe("site-1")
    })

    it("exposes activeSiteId equal to initialSiteId regardless of fetch result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-2") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.activeSiteId).toBe("site-2")
    })

    it("leaves sites empty and isLoading false when the fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper(null) })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.sites).toEqual([])
    })

    it("exposes a refetchSites function", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper(null) })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(typeof result.current.refetchSites).toBe("function")
    })
  })

  describe("switchSite", () => {
    it("POSTs to /api/sites/switch with the given siteId", async () => {
      // Stub window.location.reload to prevent jsdom "Not implemented" errors
      // and stop the test from hanging on a reload-triggered re-render.
      const reloadSpy = vi.fn()
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      })

      // Initial /api/sites fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      // /api/sites/switch call
      mockFetch.mockResolvedValueOnce({ ok: true })
      // Subsequent refetch of /api/sites triggered by invalidateQueries
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })

      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-1") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.switchSite("site-2")

      expect(mockFetch).toHaveBeenCalledWith("/api/sites/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: "site-2" }),
      })
    })

    it("calls window.location.reload() after switching", async () => {
      const reloadSpy = vi.fn()
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      })

      // Initial /api/sites fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })
      // /api/sites/switch call
      mockFetch.mockResolvedValueOnce({ ok: true })
      // Subsequent refetch of /api/sites triggered by invalidateQueries
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ sites: fakeSites }),
      })

      const { result } = renderHook(() => useSite(), { wrapper: makeWrapper("site-1") })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.switchSite("site-2")

      expect(reloadSpy).toHaveBeenCalledTimes(1)
    })
  })
})
