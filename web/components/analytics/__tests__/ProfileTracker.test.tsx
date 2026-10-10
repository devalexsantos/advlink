import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import { ProfileTracker } from "@/components/analytics/ProfileTracker"

const sendBeaconMock = vi.fn(() => true)

async function beaconBodies() {
  return Promise.all(
    sendBeaconMock.mock.calls.map(async (call) => JSON.parse(await ((call as unknown[])[1] as Blob).text())),
  )
}

function clickLink(href: string) {
  const a = document.createElement("a")
  a.setAttribute("href", href)
  const span = document.createElement("span")
  a.appendChild(span)
  // Prevent jsdom navigation
  a.addEventListener("click", (e) => e.preventDefault())
  document.body.appendChild(a)
  span.click()
  a.remove()
}

describe("ProfileTracker", () => {
  beforeEach(() => {
    sendBeaconMock.mockClear()
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeaconMock, configurable: true })
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("sends a page view beacon on mount", async () => {
    render(<ProfileTracker slug="joao" />)
    const [pv] = await beaconBodies()
    expect(pv).toMatchObject({ slug: "joao", path: "/" })
    expect(pv.type).toBeUndefined()
  })

  it("sends a contact beacon with only the channel when a WhatsApp link is clicked", async () => {
    render(<ProfileTracker slug="joao" />)
    clickLink("https://wa.me/5511999999999")
    const bodies = await beaconBodies()
    expect(bodies[1]).toEqual({ slug: "joao", type: "contact", kind: "whatsapp" })
  })

  it("ignores internal links and anchors", async () => {
    render(<ProfileTracker slug="joao" />)
    clickLink("#contato")
    clickLink("/termos")
    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
  })

  it("removes the click listener on unmount", () => {
    const { unmount } = render(<ProfileTracker slug="joao" />)
    unmount()
    clickLink("tel:+5511999999999")
    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
  })
})
