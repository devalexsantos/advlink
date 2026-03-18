import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

// Mock recharts — these components use canvas/SVG that jsdom cannot render reliably.
// XAxis and Tooltip render their formatter outputs as text so we can assert formatted values.
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: ({ tickFormatter, data }: { tickFormatter?: (v: unknown) => string; data?: unknown[] }) => {
    if (tickFormatter && data && (data as unknown[]).length > 0) {
      return <div data-testid="xaxis-ticks">{tickFormatter((data as Array<{ day?: string; hour?: number }>)[0].day ?? (data as Array<{ day?: string; hour?: number }>)[0].hour)}</div>
    }
    return null
  },
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({ labelFormatter }: { labelFormatter?: (label: unknown) => string }) => {
    if (labelFormatter) {
      return <div data-testid="tooltip-label">{labelFormatter("2024-01-15")}</div>
    }
    return null
  },
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-has-data={data ? data.length : 0}>{children}</div>
  ),
  Bar: () => null,
}))

import AnalyticsDashboard from "@/app/profile/analytics/AnalyticsDashboard"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const FULL_DATA = {
  totalViews: 1500,
  uniqueVisitors: 420,
  sources: [
    { source: "Google", count: 800 },
    { source: "Direto", count: 700 },
  ],
  devices: [
    { type: "mobile", count: 900 },
    { type: "desktop", count: 600 },
  ],
  browsers: [
    { name: "Chrome", count: 1000 },
    { name: "Safari", count: 500 },
  ],
  countries: [{ country: "Brasil", count: 1400 }],
  cities: [
    { city: "São Paulo", count: 600 },
    { city: "Rio de Janeiro", count: 300 },
  ],
  hourly: [{ hour: 14, count: 200 }],
  daily: [{ day: "2024-01-15", count: 150 }],
  period: 30,
}

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("loading state", () => {
    it("shows loading skeletons while data is being fetched", () => {
      // Never resolves so we stay in the loading state
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      // Skeleton divs are rendered with animate-pulse class
      const skeletons = document.querySelectorAll(".animate-pulse")
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe("header and period selectors", () => {
    it("renders the 'Analíticas' heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      expect(screen.getByRole("heading", { name: /analíticas/i })).toBeInTheDocument()
    })

    it("renders the three period buttons: 7 dias, 30 dias, 90 dias", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      expect(screen.getByRole("button", { name: "7 dias" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "30 dias" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "90 dias" })).toBeInTheDocument()
    })

    it("defaults to the '30 dias' period", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      // The 30 dias button starts as the active one (bg-background class)
      const btn30 = screen.getByRole("button", { name: "30 dias" })
      expect(btn30.className).toMatch(/bg-background/)
    })

    it("calls the API with the selected period when a period button is clicked", async () => {
      // First call for default 30-day period
      mockFetch.mockResolvedValue({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/analytics?days=30", expect.anything()))

      // Click 7 dias
      await userEvent.click(screen.getByRole("button", { name: "7 dias" }))
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/analytics?days=7", expect.anything()))
    })

    it("clicking 90 dias triggers a request for 90 days", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole("button", { name: "90 dias" }))
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/analytics?days=90", expect.anything()))
    })
  })

  describe("overview cards", () => {
    it("displays the unique visitors count after data loads", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("420")).toBeInTheDocument())
    })

    it("displays the total views count after data loads", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("1500")).toBeInTheDocument())
    })

    it("shows 0 for unique visitors when data has no values", async () => {
      const emptyData = { ...FULL_DATA, uniqueVisitors: 0, totalViews: 0 }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => emptyData })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const zeros = screen.getAllByText("0")
        expect(zeros.length).toBeGreaterThanOrEqual(2)
      })
    })

    it("renders the 'Visitantes únicos' label", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("Visitantes únicos")).toBeInTheDocument())
    })

    it("renders the 'Visualizações' label", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("Visualizações")).toBeInTheDocument())
    })
  })

  describe("chart sections", () => {
    it("renders the 'Visitas ao longo do tempo' section heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() =>
        expect(screen.getByText("Visitas ao longo do tempo")).toBeInTheDocument()
      )
    })

    it("renders the 'Fontes de tráfego' section heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() =>
        expect(screen.getByText("Fontes de tráfego")).toBeInTheDocument()
      )
    })

    it("renders the 'Dispositivos' section heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("Dispositivos")).toBeInTheDocument())
    })

    it("renders the 'Horários de pico' section heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByText("Horários de pico")).toBeInTheDocument())
    })
  })

  describe("sources data", () => {
    it("renders source names and counts as legend items", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument()
        expect(screen.getByText("Direto")).toBeInTheDocument()
      })
    })

    it("shows 'Sem dados ainda' for sources when the list is empty", async () => {
      const noSources = { ...FULL_DATA, sources: [] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => noSources })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const messages = screen.getAllByText(/sem dados ainda/i)
        expect(messages.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe("devices data", () => {
    it("renders device type names and counts", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        expect(screen.getByText("mobile")).toBeInTheDocument()
        expect(screen.getByText("desktop")).toBeInTheDocument()
      })
    })
  })

  describe("cities and browsers tables", () => {
    it("renders city names", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        expect(screen.getByText("São Paulo")).toBeInTheDocument()
        expect(screen.getByText("Rio de Janeiro")).toBeInTheDocument()
      })
    })

    it("renders browser names", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        expect(screen.getByText("Chrome")).toBeInTheDocument()
        expect(screen.getByText("Safari")).toBeInTheDocument()
      })
    })

    it("shows 'Sem dados ainda' for cities when empty", async () => {
      const noCities = { ...FULL_DATA, cities: [] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => noCities })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const messages = screen.getAllByText(/sem dados ainda/i)
        expect(messages.length).toBeGreaterThanOrEqual(1)
      })
    })

    it("shows 'Sem dados ainda' for browsers when empty", async () => {
      const noBrowsers = { ...FULL_DATA, browsers: [] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => noBrowsers })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const messages = screen.getAllByText(/sem dados ainda/i)
        expect(messages.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe("formatDay utility (lines 50-51, 143)", () => {
    it("Tooltip labelFormatter produces a formatted pt-BR date string from a day key", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => FULL_DATA })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      // The Tooltip mock calls labelFormatter("2024-01-15") and renders the result
      await waitFor(() => {
        const tooltipLabels = screen.getAllByTestId("tooltip-label")
        // The formatted date for "2024-01-15" in pt-BR should look like "15/01"
        const hasFormattedDate = tooltipLabels.some((el) =>
          el.textContent?.match(/\d{2}\/\d{2}/)
        )
        expect(hasFormattedDate).toBe(true)
      })
    })
  })

  describe("fillHours utility (lines 268-277)", () => {
    it("BarChart receives 24 entries filling all hours even when hourly data is sparse", async () => {
      // Only hour 14 has data — fillHours must pad the rest with 0
      const sparseHourly = { ...FULL_DATA, hourly: [{ hour: 14, count: 200 }] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sparseHourly })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const barChart = screen.getByTestId("bar-chart")
        // data-has-data should be 24 after fillHours pads all hours
        expect(barChart.getAttribute("data-has-data")).toBe("24")
      })
    })

    it("BarChart receives 24 entries when hourly data is completely empty", async () => {
      const noHourly = { ...FULL_DATA, hourly: [] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => noHourly })
      render(<AnalyticsDashboard />, { wrapper: makeWrapper() })
      await waitFor(() => {
        const barChart = screen.getByTestId("bar-chart")
        expect(barChart.getAttribute("data-has-data")).toBe("24")
      })
    })
  })
})
