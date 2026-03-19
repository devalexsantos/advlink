"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Button } from "@/components/ui/button"
import { Mail, Phone, User } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"

type TeamMember = {
  id: string
  name: string
  description: string | null
  avatarUrl: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
}

export function TeamCarousel({
  members,
  primary,
  text,
  secondary,
}: {
  members: TeamMember[]
  primary: string
  text: string
  secondary: string
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, skipSnaps: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

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

  const slides = useMemo(() => members, [members])

  return (
    <div className="w-full mx-auto max-w-6xl">
      <div className="relative">
        {/* Arrow esquerda */}
        <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => emblaApi?.scrollPrev()}
          >
            ◀
          </Button>
        </div>
        {/* Arrow direita */}
        <div className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => emblaApi?.scrollNext()}
          >
            ▶
          </Button>
        </div>

        <div className="overflow-hidden px-10" ref={emblaRef}>
          <div className="flex gap-4">
            {slides.map((member) => (
              <div key={member.id} className="min-w-0 shrink-0 basis-full md:basis-1/3">
                <div
                  className="h-full rounded-xl border p-6"
                  style={{ borderColor: `${text}33` }}
                >
                  {/* Avatar */}
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-24 h-24 rounded-full object-cover mx-auto"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                      style={{ backgroundColor: `${text}20` }}
                    >
                      <User className="w-10 h-10" style={{ color: `${text}80` }} />
                    </div>
                  )}

                  {/* Name */}
                  <p
                    className="text-lg font-semibold text-center mt-3"
                    style={{ color: secondary }}
                  >
                    {member.name}
                  </p>

                  {/* Description */}
                  {member.description && (
                    <p
                      className="text-sm text-center mt-1 line-clamp-3"
                      style={{ color: `${text}cc` }}
                    >
                      {member.description}
                    </p>
                  )}

                  {/* Contact icons */}
                  {(member.whatsapp || member.phone || member.email) && (
                    <div className="flex items-center justify-center gap-3 mt-3">
                      {member.whatsapp && (
                        <a
                          href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="WhatsApp"
                          className="w-9 h-9 rounded-full border flex items-center justify-center transition-opacity hover:opacity-70"
                          style={{ borderColor: `${text}33`, color: text }}
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </a>
                      )}
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Telefone"
                          className="w-9 h-9 rounded-full border flex items-center justify-center transition-opacity hover:opacity-70"
                          style={{ borderColor: `${text}33`, color: text }}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="E-mail"
                          className="w-9 h-9 rounded-full border flex items-center justify-center transition-opacity hover:opacity-70"
                          style={{ borderColor: `${text}33`, color: text }}
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
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
    </div>
  )
}
