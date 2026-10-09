"use client"

import { CheckCircle2, ExternalLink } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getProfileUrl } from "@/lib/site-url"
import ChangeSlugButton from "./ChangeSlugButton"

type Props = {
  slug?: string | null
}

export default function PublishedCTA({ slug }: Props) {
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { cache: "no-store" })
      if (!res.ok) throw new Error("Falha ao carregar perfil")
      return res.json() as Promise<{ profile: { slug?: string | null } | null }>
    },
  })

  const effectiveSlug = data?.profile?.slug ?? slug ?? ""
  const hasSlug = effectiveSlug.trim().length > 0
  const href = hasSlug ? getProfileUrl(effectiveSlug).replace(/\/$/, "") : undefined

  return (
    <>
      <div className="w-full max-w-4xl mb-4 rounded-xl border bg-opacity-10 p-4 md:p-5 border-lime-500/60 bg-lime-500/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <CheckCircle2 className="w-6 h-6 text-lime-400" />
            </div>
            <p className="text-sm md:text-base text-lime-800">
              <span className="font-semibold text-lime-700">Seu site está publicado!</span>{" "}
              {hasSlug ? (
                <>
                  O seu link é:{" "}
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-lime-400 underline-offset-4 hover:text-lime-900"
                  >
                    {href}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              ) : (
                <>
                  Defina o link público da sua página para divulgá-la.
                </>
              )}
              {" "}
              <ChangeSlugButton effectiveSlug={effectiveSlug} />
            </p>
          </div>
        </div>
      </div>

    </>
  )
}


