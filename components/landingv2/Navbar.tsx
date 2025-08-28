"use client"

import { useEffect, useState } from "react"

const links: { label: string; href: string }[] = [
  { label: "Início", href: "#inicio" },
  { label: "Vantagens", href: "#vantagens" },
  { label: "Como funciona", href: "#passo-a-passo" },
  { label: "Preço", href: "#preco" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="w-full max-w-4xl px-3 fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <nav
        className={
          "rounded-full border px-5 py-2 text-sm transition-colors " +
          (scrolled
            ? "bg-white/80 border-zinc-200 backdrop-blur-md shadow-sm"
            : "bg-white/50 border-zinc-200 backdrop-blur-md")
        }
        aria-label="Navegação principal"
      >
        <ul className="flex items-center gap-4 md:gap-6 justify-center">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-zinc-700 hover:text-zinc-900 transition"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}


