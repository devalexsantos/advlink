"use client"

import { useRouter } from "next/navigation"
import { useSite } from "./SiteContext"
import { ChevronsUpDown, Plus, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"

export function SiteSwitcher() {
  const { sites, activeSite, switchSite } = useSite()
  const { state } = useSidebar()
  const router = useRouter()
  const collapsed = state === "collapsed"

  const displayName = activeSite?.name || activeSite?.publicName || "Meu site"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm hover:bg-accent transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/10">
            <Globe className="h-3.5 w-3.5 text-primary" />
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left font-medium">{displayName}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {sites.map((site) => (
          <DropdownMenuItem
            key={site.id}
            onClick={() => {
              if (site.id !== activeSite?.id) {
                switchSite(site.id)
              }
            }}
            className="flex items-center gap-2"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${site.isActive ? "bg-emerald-500" : "bg-zinc-300"}`}
            />
            <span className="flex-1 truncate">{site.name || site.publicName || "Sem nome"}</span>
            {site.id === activeSite?.id && (
              <span className="text-xs text-muted-foreground">atual</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/onboarding/new-site")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Criar novo site</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
