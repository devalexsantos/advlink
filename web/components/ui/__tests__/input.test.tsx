import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("renders with type text", () => {
    render(<Input type="text" placeholder="Enter text" />)
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument()
  })

  it("renders with type email", () => {
    render(<Input type="email" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email")
  })

  it("applies disabled state", () => {
    render(<Input disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("applies custom className", () => {
    render(<Input className="custom-class" />)
    expect(screen.getByRole("textbox")).toHaveClass("custom-class")
  })
})
