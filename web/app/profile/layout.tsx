"use client"

import { Suspense } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { MobilePreviewProvider } from "./MobilePreviewContext"
import { MobilePreviewToggle } from "./MobilePreviewToggle"

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobilePreviewProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center justify-between border-b border-border px-4 lg:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <span className="text-sm font-semibold">AdvLink</span>
            </div>
            <MobilePreviewToggle />
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </MobilePreviewProvider>
  )
}
