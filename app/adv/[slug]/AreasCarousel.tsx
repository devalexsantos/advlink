"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { marked } from "marked"
import { Info, Mail, Phone } from "lucide-react"
import whatsAppIcon from "@/assets/icons/whatsapp-icon.svg"

marked.setOptions({ breaks: true })

type Area = {
  id: string
  title: string
  description: string | null
  coverImageUrl?: string | null
}

export function AreasCarousel({
  areas,
  primary,
  text,
  whatsapp,
  publicPhone,
  publicEmail,
}: {
  areas: Area[]
  primary: string
  text: string
  whatsapp?: string | null
  publicPhone?: string | null
  publicEmail?: string | null
}) {
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

  const slides = useMemo(() => areas, [areas])

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
            {slides.map((area) => (
              <div
                key={area.id}
                className="min-w-0 shrink-0 basis-full md:basis-1/3"
              >
                <div className={`h-full rounded-xl border bg-white/5 p-4`} style={{ borderColor: `${text}33` }}>
                    {area.coverImageUrl && (
                      <div className="mb-3 h-36 w-full overflow-hidden rounded-md bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={area.coverImageUrl} alt={area.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                  <h3 className="text-lg font-semibold" style={{ color: text }}>{area.title}</h3>
                  {area.description && (
                    <div
                      className="mt-2 text-sm "
                      style={{ display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}
                      dangerouslySetInnerHTML={{ __html: marked.parse(area.description) as string }}
                    />
                  )}
                    <div className="mt-3"
                    >
                      <Button size="sm" 
                      style={{ backgroundColor: primary, color: text, border: "1px solid", borderColor: `${text}33`, cursor: "pointer" }} onClick={() => setOpenId(area.id)}>
                        <Info className="w-4 h-4" />
                        Saiba mais
                      </Button>
                    </div>
                </div>
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

      {/* Modal */}
      {slides.map((area) => (
        <Dialog key={area.id} open={openId === area.id} onOpenChange={(v) => !v && setOpenId(null)}>
          <DialogContent
            className="w-[90vw] max-w-6xl max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: primary, color: text, borderColor: `${text}33` }}
          >
            <DialogHeader>
              <DialogTitle className="text-3xl" style={{ color: text }}>{area.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                {area.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
              <div className="h-64 w-full overflow-hidden rounded-md" style={{ backgroundColor: `${text}14` }}>
                  <img src={area.coverImageUrl} alt={area.title} className="h-full w-full object-cover" />
              </div>
                )}
              {area.description && (() => {
                const raw = marked.parse(area.description) as string
                const spaced = raw.replace(/<p>/g, '<p style="margin: 0 0 16px 0;">')
                return (
                  <div
                    className="prose prose-invert max-w-none text-lg leading-relaxed"
                    style={{ color: text }}
                    dangerouslySetInnerHTML={{ __html: spaced }}
                  />
                )
              })()}
              <div className="flex flex-col gap-2 mt-8">
                <h3 className="text-lg font-semibold text-center" style={{ color: text }}>Entre em contato agora mesmo para falar sobre o seu caso</h3>
                <div className="flex flex-col items-center justify-center md:flex-row gap-2">
              {whatsapp && (
                <div>
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <Button size="sm" style={{ backgroundColor: primary, color: text, border: "1px solid", borderColor: `${text}33`, cursor: "pointer" }}>
                      <img src={whatsAppIcon.src} alt="WhatsApp" className="w-4 h-4" />
                      Contato via WhatsApp
                    </Button>
                  </a>
                </div>
              )}
              {publicPhone && (
                <div>
                  <a href={`tel:${publicPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <Button size="sm" style={{ backgroundColor: primary, color: text, border: "1px solid", borderColor: `${text}33`, cursor: "pointer" }}>
                      <Phone className="w-4 h-4" />
                      Contato via Telefone
                    </Button>
                  </a>
                </div>
              )}
              {publicEmail && (
                <div>
                  <a href={`mailto:${publicEmail}`} target="_blank" rel="noreferrer">
                    <Button size="sm" style={{ backgroundColor: primary, color: text, border: "1px solid", borderColor: `${text}33`, cursor: "pointer" }}>
                      <Mail className="w-4 h-4" />
                      Contato via E-mail
                    </Button>
                  </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}


