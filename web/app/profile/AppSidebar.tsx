"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import logo from "@/public/images/advlink-logo-black.svg"
import {
  Paintbrush,
  User,
  MapPin,
  ListTree,
  Images,
  Link as LinkIcon,
  Search,
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  MessageSquare,
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

const editorItems = [
  { label: "Estilo", icon: Paintbrush, tab: "estilo" },
  { label: "Perfil e Contato", icon: User, tab: "perfil" },
  { label: "Endereço", icon: MapPin, tab: "endereco" },
  { label: "Áreas ou serviços", icon: ListTree, tab: "areas" },
  { label: "Galeria", icon: Images, tab: "galeria" },
  { label: "Links", icon: LinkIcon, tab: "links" },
  { label: "SEO", icon: Search, tab: "seo" },
]

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "estilo"
  const { setOpenMobile, toggleSidebar, state } = useSidebar()

  const isEditPage = pathname === "/profile/edit"

  function navigateTab(tab: string) {
    router.push(`/profile/edit?tab=${tab}`, { scroll: false })
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center px-2 py-2">
              <Image src={logo} alt="AdvLink" width={120} height={34} className="h-9 w-auto group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden lg:block">
            <SidebarMenuButton onClick={toggleSidebar} tooltip={state === "collapsed" ? "Expandir" : "Retrair"}>
              {state === "collapsed" ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              <span>Retrair menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Editor</SidebarGroupLabel>
          <SidebarMenu>
            {editorItems.map((item) => (
              <SidebarMenuItem key={item.tab}>
                <SidebarMenuButton
                  isActive={isEditPage && currentTab === item.tab}
                  onClick={() => navigateTab(item.tab)}
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dados</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/profile/analytics"}
                onClick={() => {
                  router.push("/profile/analytics")
                  setOpenMobile(false)
                }}
                tooltip="Analytics"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ajuda</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/profile/tickets")}
                onClick={() => {
                  router.push("/profile/tickets")
                  setOpenMobile(false)
                }}
                tooltip="Suporte"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Suporte</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/profile/account"}
              onClick={() => {
                router.push("/profile/account")
                setOpenMobile(false)
              }}
              tooltip="Minha Conta"
            >
              <CreditCard className="h-5 w-5" />
              <span>Minha Conta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              tooltip="Sair"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
