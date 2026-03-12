"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Globe,
  MessageSquare,
  DollarSign,
  Shield,
  FileText,
  Activity,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAdmin } from "./AdminProvider"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Usuários", icon: Users, href: "/admin/users" },
  { label: "Sites", icon: Globe, href: "/admin/sites" },
  { label: "Tickets", icon: MessageSquare, href: "/admin/tickets" },
  { label: "Eventos", icon: Activity, href: "/admin/events" },
  { label: "Financeiro", icon: DollarSign, href: "/admin/financial" },
  { label: "Administradores", icon: Shield, href: "/admin/admins" },
  { label: "Auditoria", icon: FileText, href: "/admin/audit" },
]

export function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { admin } = useAdmin()
  const { setOpenMobile, toggleSidebar, state } = useSidebar()

  function navigate(href: string) {
    router.push(href)
    setOpenMobile(false)
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.push("/admin/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center px-2 py-2">
              <span className="text-lg font-bold group-data-[collapsible=icon]:hidden">
                AdvLink Admin
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden lg:block">
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={state === "collapsed" ? "Expandir" : "Retrair"}
            >
              {state === "collapsed" ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
              <span>Retrair menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href)
                  }
                  onClick={() => navigate(item.href)}
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {admin && (
            <SidebarMenuItem>
              <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">{admin.name || admin.email}</p>
                <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
