import type { Metadata } from "next"

// Private area: never indexed
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
