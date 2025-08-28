import Link from "next/link"
import whiteLogo from "/public/images/advlink-white-logo.svg"
import Image from "next/image"

export function DashboardFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-800 bg-gradient-to-b from-zinc-950 to-black">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-2">
              <Image src={whiteLogo} alt="AdvLink" width={80} height={80} className="w-20 h-20" />
            </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-3">Contato</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Email: <a href="mailto:advlinkcontato@gmail.com" className="hover:text-zinc-200 transition">advlinkcontato@gmail.com</a></li>
              <li>Políticas: <Link href="/termos-e-privacidade" target="_blank" className="hover:text-zinc-200 transition">Termos & Privacidade</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} AdvLink — Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}


