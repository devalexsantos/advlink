"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export type Site = {
  id: string
  name: string | null
  publicName: string | null
  slug: string | null
  isActive: boolean
  setupComplete: boolean
  avatarUrl: string | null
  createdAt: string
}

type SiteContextType = {
  sites: Site[]
  activeSiteId: string | null
  activeSite: Site | undefined
  isLoading: boolean
  switchSite: (siteId: string) => Promise<void>
  refetchSites: () => void
}

const SiteContext = createContext<SiteContextType | null>(null)

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error("useSite must be used within SiteProvider")
  return ctx
}

export function SiteProvider({
  initialSiteId,
  children,
}: {
  initialSiteId: string | null
  children: ReactNode
}) {
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const res = await fetch("/api/sites")
      if (!res.ok) throw new Error("Failed to fetch sites")
      return res.json() as Promise<{ sites: Site[] }>
    },
  })

  const sites = data?.sites ?? []
  const activeSiteId = initialSiteId
  const activeSite = sites.find((s) => s.id === activeSiteId) ?? sites[0]

  const switchSite = useCallback(
    async (siteId: string) => {
      await fetch("/api/sites/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      })
      // Invalidate all queries to refetch with new site
      await qc.invalidateQueries()
      // Force full page reload to update server components
      window.location.reload()
    },
    [qc]
  )

  return (
    <SiteContext.Provider
      value={{
        sites,
        activeSiteId,
        activeSite,
        isLoading,
        switchSite,
        refetchSites: refetch,
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}
