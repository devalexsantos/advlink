import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
const emblaMock = vi.hoisted(() => {
  const ref = () => {}
  const api = {
    canScrollPrev: () => false,
    canScrollNext: () => false,
    on: () => api,
    off: () => api,
    scrollPrev: () => {},
    scrollNext: () => {},
    scrollSnapList: () => [] as number[],
    selectedScrollSnap: () => 0,
    reInit: () => {},
  }
  return { result: [ref, api] as const }
})

vi.mock("embla-carousel-react", () => ({ default: () => emblaMock.result }))

import { TeamCarousel } from "../TeamCarousel"

const member = {
  id: "m1",
  name: "Dr. Pedro",
  description: null,
  avatarUrl: null,
  phone: null,
  whatsapp: null,
  email: null,
}

describe("TeamCarousel OAB", () => {
  it("shows the member's formatted OAB under the name", () => {
    render(
      <TeamCarousel members={[{ ...member, oabNumber: "98765", oabState: "RJ" }]} primary="#111" text="#fff" secondary="#eee" />
    )
    expect(screen.getByText("OAB/RJ 98.765")).toBeInTheDocument()
  })

  it("omits the line when the member has no OAB", () => {
    render(<TeamCarousel members={[member]} primary="#111" text="#fff" secondary="#eee" />)
    expect(screen.queryByText(/^OAB\//)).not.toBeInTheDocument()
  })
})
