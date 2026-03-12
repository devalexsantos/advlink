"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "./AdminSidebar"
import { AdminProvider } from "./AdminProvider"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"

  // Login page doesn't use sidebar layout
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <AdminProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b border-border px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
            <span className="ml-2 text-sm font-semibold">Admin</span>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminProvider>
  )
}
