import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"

describe("WhatsAppIcon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<WhatsAppIcon />)
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("applies the className prop to the SVG", () => {
    const { container } = render(<WhatsAppIcon className="w-6 h-6 text-green-500" />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveClass("w-6 h-6 text-green-500")
  })

  it("renders without a className prop without errors", () => {
    const { container } = render(<WhatsAppIcon />)
    const svg = container.querySelector("svg")
    // className attribute should be absent or empty when not provided
    expect(svg).not.toHaveClass("undefined")
  })

  it("has the expected SVG attributes for stroke-based icons", () => {
    const { container } = render(<WhatsAppIcon />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24")
    expect(svg).toHaveAttribute("fill", "none")
    expect(svg).toHaveAttribute("stroke", "currentColor")
  })

  it("renders two path elements inside the SVG", () => {
    const { container } = render(<WhatsAppIcon />)
    const paths = container.querySelectorAll("svg path")
    expect(paths).toHaveLength(2)
  })
})
