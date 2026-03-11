export type AnalyticsData = {
  totalViews: number
  uniqueVisitors: number
  sources: { source: string; count: number }[]
  devices: { type: string; count: number }[]
  browsers: { name: string; count: number }[]
  countries: { country: string; count: number }[]
  cities: { city: string; count: number }[]
  hourly: { hour: number; count: number }[]
  daily: { day: string; count: number }[]
  period: number
}
