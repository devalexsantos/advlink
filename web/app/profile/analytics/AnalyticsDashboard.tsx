"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { Users, Eye } from "lucide-react"
import { fetchAnalytics } from "./api"
import type { AnalyticsData } from "./types"

const PERIODS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
]

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
      {children}
    </div>
  )
}

function formatDay(day: string) {
  const d = new Date(day + "T00:00:00")
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", days],
    queryFn: () => fetchAnalytics(days),
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analíticas</h1>
        <div className="flex gap-1.5 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visitantes únicos</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold">{data?.uniqueVisitors ?? 0}</p>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visualizações</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold">{data?.totalViews ?? 0}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Area chart — daily views */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Visitas ao longo do tempo</h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.daily ?? []}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tickFormatter={formatDay} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={(label) => formatDay(String(label))}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Visitas"
                stroke="var(--chart-1)"
                fill="url(#colorViews)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Sources + Devices pie charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Fontes de tráfego</h2>
          {isLoading ? (
            <Skeleton className="mx-auto h-48 w-48" />
          ) : data?.sources?.length ? (
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.sources}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.sources.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {data.sources.map((s, i) => (
                  <div key={s.source} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{s.source}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Dispositivos</h2>
          {isLoading ? (
            <Skeleton className="mx-auto h-48 w-48" />
          ) : data?.devices?.length ? (
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.devices}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.devices.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {data.devices.map((d, i) => (
                  <div key={d.type} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground capitalize">{d.type}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda</p>
          )}
        </Card>
      </div>

      {/* Hourly bar chart */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Horários de pico</h2>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fillHours(data?.hourly ?? [])}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={(label) => `${label}:00`}
              />
              <Bar dataKey="count" name="Visitas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Cities + Browsers tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Principais cidades</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : data?.cities?.length ? (
            <div className="space-y-2">
              {data.cities.map((c) => (
                <div key={c.city} className="flex items-center justify-between text-sm">
                  <span>{c.city}</span>
                  <span className="font-medium text-muted-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem dados ainda</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Navegadores</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : data?.browsers?.length ? (
            <div className="space-y-2">
              {data.browsers.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <span>{b.name}</span>
                  <span className="font-medium text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem dados ainda</p>
          )}
        </Card>
      </div>

    </div>
  )
}

/** Fill missing hours 0-23 with count 0 */
function fillHours(data: { hour: number; count: number }[]) {
  const map = new Map(data.map((d) => [d.hour, d.count]))
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map.get(i) ?? 0 }))
}
