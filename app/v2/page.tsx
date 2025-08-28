import { Hero } from "@/components/landingv2/Hero"
import { Advantages } from "@/components/landingv2/Advantages"
import { Navbar } from "@/components/landingv2/Navbar"
import { Footer } from "@/components/landing/Footer"
import { CTA } from "@/components/landingv2/CTA"
import { Steps } from "@/components/landingv2/Steps"
import { InsidePreview } from "@/components/landingv2/InsidePreview"
import { Pricing } from "@/components/landingv2/Pricing"

export default function PageV2() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
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


