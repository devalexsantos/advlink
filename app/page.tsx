import { Hero } from "@/components/landing/Hero"
// import { Highlights } from "@/components/landing/Highlights"
// import { Benefits } from "@/components/landing/Benefits"
import { Pricing } from "@/components/landing/Pricing"
import { CTA } from "@/components/landing/CTA"
import { Advantages } from "@/components/landing/Advantages"
import { Steps } from "@/components/landing/Steps"
import { InsidePreview } from "@/components/landing/InsidePreview"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"

export default function Page() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-zinc-100">
      <Navbar />
      <div id="inicio">
        <Hero />
      </div>

      <div id="vantagens">
        <Advantages />
      </div>

      <div id="passo-a-passo">
        <Steps />
      </div>

      <div id="comece">
        <CTA />
      </div>

      <div id="por-dentro">
        <InsidePreview />
      </div>

      <div id="preco">
        <Pricing />
      </div>

      <Footer />
    </div>
  )
}