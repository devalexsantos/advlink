import type { AnalyticsData } from "./types"

export async function fetchAnalytics(days: number): Promise<AnalyticsData> {
  const res = await fetch(`/api/analytics?days=${days}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar analíticas")
  return res.json()
}
