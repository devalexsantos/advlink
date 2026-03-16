import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("renders all variants without crash", () => {
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument()
      unmount()
    }
  })

  it("renders all sizes without crash", () => {
    const sizes = ["default", "sm", "lg", "icon"] as const
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>btn</Button>)
      expect(screen.getByRole("button")).toBeInTheDocument()
      unmount()
    }
  })

  it("applies disabled attribute", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("applies custom className", () => {
    render(<Button className="my-class">Test</Button>)
    expect(screen.getByRole("button")).toHaveClass("my-class")
  })

  it("renders as child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    )
    const link = screen.getByRole("link", { name: "Link" })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe("A")
  })
})
