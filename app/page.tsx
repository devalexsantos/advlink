import { Hero } from "@/components/landing/Hero"
import { Highlights } from "@/components/landing/Highlights"
import { Benefits } from "@/components/landing/Benefits"
import { Pricing } from "@/components/landing/Pricing"
import { CTA } from "@/components/landing/CTA"

export default function Page() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0f1a] text-zinc-100">
      <Hero />

      <Highlights />

      <Benefits />

      <Pricing />

      <CTA />
    </div>
  )
}