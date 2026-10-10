import { cache } from "react"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { loadPublicProfile } from "@/lib/public-profile"
import { getProfileUrl } from "@/lib/site-url"
import PublicProfileView from "@/app/adv/[slug]/PublicProfileView"

// Expiry must be checked on every request
export const dynamic = "force-dynamic"

type RouteParams = Promise<{ token: string }>

// Tokens are randomBytes(24) in base64url (32 chars); anything else is rejected without a query
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/

const NOINDEX = { index: false, follow: false } as const

/** Valid (existing, unexpired) preview link for the token, or null. Deduped per request. */
const findValidPreview = cache(async (token: string) => {
  if (!TOKEN_RE.test(token)) return null
  const link = await prisma.previewLink.findUnique({
    where: { token },
    select: { profileId: true, expiresAt: true, profile: { select: { publicName: true, suspendedByAdmin: true } } },
  })
  if (!link || link.expiresAt.getTime() <= Date.now() || link.profile.suspendedByAdmin) return null
  return link
})

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { token } = await params
  const link = await findValidPreview(token)
  return {
    title: link ? `Prévia: ${link.profile.publicName || "site"}` : "Prévia indisponível",
    robots: NOINDEX,
    // The token is the credential: never leak it to third parties through the Referer header
    referrer: "no-referrer",
  }
}

export default async function PreviewPage({ params }: { params: RouteParams }) {
  const { token } = await params
  const link = await findValidPreview(token)
  const data = link ? await loadPublicProfile({ id: link.profileId }) : null
  if (!data) return <PreviewUnavailable />

  const { profile } = data
  return (
    <PublicProfileView
      data={data}
      slug={profile.slug ?? ""}
      showTracker={false}
      gtmContainerId={null}
      privacyUrl={profile.slug ? `/adv/${profile.slug}/privacidade` : undefined}
      banner={<PreviewBanner publishedUrl={profile.isActive && profile.slug ? getProfileUrl(profile.slug) : null} />}
    />
  )
}

function PreviewBanner({ publishedUrl }: { publishedUrl: string | null }) {
  return (
    <div
      role="status"
      className="sticky top-0 z-[100] w-full bg-amber-400 px-4 py-2 text-center text-sm font-medium text-zinc-950 shadow"
    >
      {publishedUrl ? (
        <>
          Prévia — este site já está publicado em{" "}
          <a href={publishedUrl} className="underline underline-offset-2">
            {publishedUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </>
      ) : (
        "Prévia — este site ainda não foi publicado"
      )}
    </div>
  )
}

function PreviewUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-center text-zinc-100">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Esta prévia expirou ou não existe</h1>
        <p className="text-zinc-400">
          Links de prévia valem por 7 dias. Peça a quem compartilhou com você um link novo.
        </p>
      </div>
    </main>
  )
}
