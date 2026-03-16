import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn()", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible")
  })

  it("deduplicates Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("handles empty/null/undefined inputs", () => {
    expect(cn("", null, undefined, "text-sm")).toBe("text-sm")
  })

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("")
  })
})
