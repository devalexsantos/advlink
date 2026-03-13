"use client"

import { useSearchParams } from "next/navigation"
import { Paintbrush, User, MapPin, ListTree, Images, Link as LinkIcon, ArrowUpDown, Search } from "lucide-react"
import EstiloSection from "./sections/EstiloSection"
import PerfilContatoSection from "./sections/PerfilContatoSection"
import EnderecoSection from "./sections/EnderecoSection"
import AreasServicosSection from "./sections/AreasServicosSection"
import GaleriaSection from "./sections/GaleriaSection"
import LinksSection from "./sections/LinksSection"
import ReordenarSection from "./sections/ReordenarSection"
import SEOSection from "./sections/SEOSection"

const sections: Record<string, { title: string; icon: React.ElementType; component: React.ComponentType }> = {
  estilo: { title: "Estilo", icon: Paintbrush, component: EstiloSection },
  perfil: { title: "Perfil e Contato", icon: User, component: PerfilContatoSection },
  endereco: { title: "Endereço", icon: MapPin, component: EnderecoSection },
  areas: { title: "Áreas ou serviços", icon: ListTree, component: AreasServicosSection },
  galeria: { title: "Galeria", icon: Images, component: GaleriaSection },
  links: { title: "Links", icon: LinkIcon, component: LinksSection },
  reordenar: { title: "Reordenar Seções", icon: ArrowUpDown, component: ReordenarSection },
  seo: { title: "SEO", icon: Search, component: SEOSection },
}

export default function SectionRenderer() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "estilo"
  const section = sections[tab] || sections.estilo
  const Icon = section.icon
  const Component = section.component

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{section.title}</h2>
      </div>
      <Component />
    </div>
  )
}
