"use client"

import useEmblaCarousel from "embla-carousel-react"
import type { PropsWithChildren } from "react"

export function Carousel({ children }: PropsWithChildren) {
  const [emblaRef] = useEmblaCarousel({ align: "start", loop: false })
  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex gap-4">{children}</div>
    </div>
  )
}

export function CarouselItem({ children }: PropsWithChildren) {
  return <div className="min-w-0 shrink-0 basis-80">{children}</div>
}


