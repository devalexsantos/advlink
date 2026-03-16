import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Badge } from "@/components/ui/badge"

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Status</Badge>)
    expect(screen.getByText("Status")).toBeInTheDocument()
  })

  it("renders all variants without crash", () => {
    const variants = ["default", "secondary", "destructive", "outline"] as const
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>)
      expect(screen.getByText(variant)).toBeInTheDocument()
      unmount()
    }
  })

  it("applies custom className", () => {
    render(<Badge className="my-badge">Test</Badge>)
    expect(screen.getByText("Test")).toHaveClass("my-badge")
  })
})
