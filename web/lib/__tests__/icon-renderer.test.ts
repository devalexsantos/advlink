import { describe, it, expect } from "vitest"
import { getIconComponent } from "@/lib/icon-renderer"

describe("getIconComponent()", () => {
  it("returns a component for a valid icon name", () => {
    const icon = getIconComponent("Scale")
    expect(icon).not.toBeNull()
    expect(typeof icon).toBe("object") // lucide icons are forwardRef objects
  })

  it("returns null for an invalid icon name", () => {
    expect(getIconComponent("xyz_nonexistent")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(getIconComponent("")).toBeNull()
  })
})
