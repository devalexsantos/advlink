"use client"

import { useState } from "react"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Settings, LayoutDashboard, Pencil, Search, Menu } from "lucide-react"
import Image from "next/image"
import logo from "@/assets/icons/logo.svg"
export default function ProfileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logo} alt="Logo" width={32} height={32} />
            <span className="text-xl font-bold tracking-tight">AdvLink</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/profile/edit">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          </Link>
          <Link href="/profile/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/profile/settings">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Configurar
            </Button>
          </Link>
          <Link href="/profile/seo">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
              <Search className="w-4 h-4" />
              SEO
            </Button>
          </Link>
          <LogoutButton variant="ghost" size="sm" className="gap-2 cursor-pointer">
            Sair
          </LogoutButton>
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button variant="secondary" size="icon" className="cursor-pointer" aria-label="Abrir menu" onClick={() => setOpen((v) => !v)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900/80">
          <nav className="mx-auto max-w-6xl px-4 py-2 grid gap-2">
            <Link href="/profile/edit" onClick={() => setOpen(false)} className="w-full">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            </Link>
            <Link href="/profile/dashboard" onClick={() => setOpen(false)} className="w-full">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <Link href="/profile/settings" onClick={() => setOpen(false)} className="w-full">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="w-4 h-4" /> Configurar
              </Button>
            </Link>
            <Link href="/profile/seo" onClick={() => setOpen(false)} className="w-full">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Search className="w-4 h-4" /> SEO
              </Button>
            </Link>
            <LogoutButton variant="destructive" className="w-full justify-start gap-2 cursor-pointer" onClick={() => setOpen(false)}>
              Sair
            </LogoutButton>
          </nav>
        </div>
      )}
    </header>
  )
}


