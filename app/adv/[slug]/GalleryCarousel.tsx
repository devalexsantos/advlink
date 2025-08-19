"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Root as VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"

type GalleryItem = {
  id: string
  coverImageUrl?: string | null
}

export function GalleryCarousel({ items, text }: { items: GalleryItem[]; text: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, skipSnaps: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    onSelect()
  }, [emblaApi, onSelect])

  const slides = useMemo(() => items, [items])

  return (
    <div className="w-full mx-auto max-w-6xl">
      <div className="relative">
        {/* Arrow esquerda */}
        <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2">
          <Button type="button" size="sm" variant="secondary" className="pointer-events-auto" onClick={() => emblaApi?.scrollPrev()}>
            ◀
          </Button>
        </div>
        {/* Arrow direita */}
        <div className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2">
          <Button type="button" size="sm" variant="secondary" className="pointer-events-auto" onClick={() => emblaApi?.scrollNext()}>
            ▶
          </Button>
        </div>

        <div className="overflow-hidden px-10" ref={emblaRef}>
          <div className="flex gap-4">
            {slides.map((g) => (
              <div key={g.id} className="min-w-0 shrink-0 basis-full md:basis-1/3">
                <button
                  type="button"
                  className="block w-full rounded-xl overflow-hidden border"
                  style={{ borderColor: `${text}33` }}
                  onClick={() => setOpenId(g.id)}
                  aria-label="Abrir imagem da galeria"
                >
                  <div className="w-full h-[350px] bg-black/30">
                    {g.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.coverImageUrl} alt="Foto da galeria" className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-sm opacity-70">Sem imagem</div>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="mt-4 flex justify-center gap-2">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 w-2 rounded-full ${i === selectedIndex ? "opacity-100" : "opacity-40"}`}
              style={{ backgroundColor: text }}
            />
          ))}
        </div>
      </div>

      {/* Modal simples para imagem */}
      {slides.map((g) => (
        <Dialog key={g.id} open={openId === g.id} onOpenChange={(v) => !v && setOpenId(null)}>
          <DialogContent className="w-auto max-w-[92vw] p-0 bg-transparent border-none shadow-none">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Visualização da imagem</DialogTitle>
              </VisuallyHidden>
            </DialogHeader>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="Fechar"
              className="absolute right-2 top-6 cursor-pointer z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/85"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full">
              {g.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.coverImageUrl} alt="Foto" className="w-full h-auto max-w-[800px] mx-auto rounded-md" />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}


